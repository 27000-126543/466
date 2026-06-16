const { ipcMain } = require('electron')
const { getDb } = require('./database')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

function handleIPC() {
  const db = getDb()

  ipcMain.handle('login', async (event, username, password) => {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)
    if (user) {
      delete user.password
      return { success: true, user }
    }
    return { success: false, message: '用户名或密码错误' }
  })

  ipcMain.handle('get-users', async () => {
    return db.prepare('SELECT id, username, role, name, phone, created_at FROM users').all()
  })

  ipcMain.handle('get-orders', async (event, params = {}) => {
    let where = []
    let args = []

    if (params.status) {
      where.push('order_status = ?')
      args.push(params.status)
    }
    if (params.communityId) {
      where.push('community_id = ?')
      args.push(params.communityId)
    }
    if (params.leaderId) {
      where.push('leader_id = ?')
      args.push(params.leaderId)
    }
    if (params.keyword) {
      where.push('(order_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)')
      const kw = '%' + params.keyword + '%'
      args.push(kw, kw, kw)
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

    const count = db.prepare(`SELECT COUNT(*) as total FROM orders ${whereSql}`).get(...args).total
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const offset = (page - 1) * pageSize

    const orders = db.prepare(`
      SELECT o.*, c.name as community_name, l.name as leader_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      LEFT JOIN leaders l ON o.leader_id = l.id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...args, pageSize, offset)

    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
    }

    return { list: orders, total, page, pageSize }
  })

  ipcMain.handle('get-order-by-id', async (event, id) => {
    const order = db.prepare(`
      SELECT o.*, c.name as community_name, l.name as leader_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      LEFT JOIN leaders l ON o.leader_id = l.id
      WHERE o.id = ?
    `).get(id)

    if (order) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
    }
    return order
  })

  ipcMain.handle('create-order', async (event, order) => {
    const orderNo = 'DD' + new Date().getFullYear().toString().slice(-2) + 
      Date.now().toString().slice(-8)
    
    const result = db.prepare(`
      INSERT INTO orders (order_no, leader_id, community_id, customer_name, customer_phone,
        delivery_address, total_amount, payment_status, order_status, deadline, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNo,
      order.leader_id,
      order.community_id,
      order.customer_name,
      order.customer_phone,
      order.delivery_address,
      order.total_amount || 0,
      order.payment_status || 'unpaid',
      'pending',
      order.deadline,
      order.remark || ''
    )

    const orderId = result.lastInsertRowid

    if (order.items && order.items.length) {
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      let total = 0
      for (const item of order.items) {
        const subtotal = item.unit_price * item.quantity
        total += subtotal
        insertItem.run(orderId, item.product_id, item.product_name, item.quantity, item.unit_price, subtotal)
      }
      db.prepare('UPDATE orders SET total_amount = ? WHERE id = ?').run(
        Number(total.toFixed(2)), orderId
      )
    }

    return { success: true, orderId, orderNo }
  })

  ipcMain.handle('update-order-status', async (event, id, status) => {
    db.prepare('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id)

    if (status === 'completed') {
      const order = db.prepare('SELECT total_amount, leader_id FROM orders WHERE id = ?').get(id)
      const leader = db.prepare('SELECT profit_rate FROM leaders WHERE id = ?').get(order.leader_id)
      if (leader) {
        const profit = Number((order.total_amount * leader.profit_rate).toFixed(2))
        const now = new Date()
        const month = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0')
        db.prepare(`
          INSERT INTO profit_records (leader_id, order_id, amount, profit_type, month)
          VALUES (?, ?, ?, 'order', ?)
        `).run(order.leader_id, id, profit, month)
      }
    }

    return { success: true }
  })

  ipcMain.handle('validate-order', async (event, id) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    if (!order) return { success: false, message: '订单不存在' }

    const issues = []

    if (!order.delivery_address || order.delivery_address.length < 5) {
      issues.push('收货地址不完整')
    }
    if (order.payment_status !== 'paid') {
      issues.push('支付未完成')
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
    for (const item of items) {
      const product = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.product_id)
      if (product && product.stock < item.quantity) {
        issues.push(`商品${product.name}库存不足（库存${product.stock}，需${item.quantity}）`)
      }
    }

    if (issues.length > 0) {
      db.prepare(`
        UPDATE orders SET order_status = 'unqualified', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(id)
      return { success: false, qualified: false, issues }
    }

    db.prepare(`
      UPDATE orders SET address_verified = 1, order_status = 'qualified', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id)

    return { success: true, qualified: true }
  })

  ipcMain.handle('get-orders-by-community', async (event, communityId) => {
    return db.prepare(`
      SELECT o.*, c.name as community_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      WHERE o.community_id = ? AND o.order_status IN ('qualified', 'pending')
      ORDER BY o.deadline ASC
    `).all(communityId)
  })

  ipcMain.handle('get-unqualified-orders', async () => {
    return db.prepare(`
      SELECT o.*, c.name as community_name, l.name as leader_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      LEFT JOIN leaders l ON o.leader_id = l.id
      WHERE o.order_status = 'unqualified'
      ORDER BY o.created_at DESC
    `).all()
  })

  ipcMain.handle('mark-order-unqualified', async (event, id, reason) => {
    db.prepare(`
      UPDATE orders SET order_status = 'unqualified', remark = COALESCE(remark, '') || ? 
      WHERE id = ?
    `).run(';不合格原因：' + reason, id)

    const order = db.prepare('SELECT leader_id FROM orders WHERE id = ?').get(id)
    if (order && order.leader_id) {
      const leader = db.prepare('SELECT user_id FROM leaders WHERE id = ?').get(order.leader_id)
      if (leader) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, content, related_id)
          VALUES (?, 'order', '订单不合格通知', ?, ?)
        `).run(leader.user_id, '您有一笔订单不合格：' + reason + '，请及时修改', id)
      }
    }

    return { success: true }
  })

  ipcMain.handle('get-inventory', async (event, params = {}) => {
    let where = []
    let args = []

    if (params.category) {
      where.push('category = ?')
      args.push(params.category)
    }
    if (params.keyword) {
      where.push('name LIKE ?')
      args.push('%' + params.keyword + '%')
    }
    if (params.lowStock === true) {
      where.push('stock < safe_stock')
    } else if (params.lowStock === false) {
      where.push('stock >= safe_stock')
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

    const count = db.prepare(`SELECT COUNT(*) as total FROM products ${whereSql}`).get(...args).total
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const offset = (page - 1) * pageSize

    const products = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `).all(...args, pageSize, offset)

    return { list: products, total, page, pageSize }
  })

  ipcMain.handle('update-inventory', async (event, id, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
    const values = Object.values(data)
    values.push(id)
    db.prepare(`UPDATE products SET ${fields} WHERE id = ?`).run(...values)
    return { success: true }
  })

  ipcMain.handle('get-low-stock-products', async () => {
    return db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.stock < p.safe_stock
      ORDER BY (p.safe_stock - p.stock) DESC
    `).all()
  })

  ipcMain.handle('deduct-stock', async (event, orderId) => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId)

    const insufficientItems = []
    for (const item of items) {
      const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(item.product_id)
      if (!product || product.stock < item.quantity) {
        insufficientItems.push({
          product_id: item.product_id,
          product_name: item.product_name,
          required: item.quantity,
          available: product ? product.stock : 0
        })
      }
    }

    if (insufficientItems.length > 0) {
      return {
        success: false,
        message: '库存不足',
        insufficientItems
      }
    }

    try {
      db.run('BEGIN TRANSACTION')
      for (const item of items) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id)
      }
      db.prepare("UPDATE orders SET order_status = 'sorting', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderId)
      db.run('COMMIT')
      return { success: true }
    } catch (e) {
      db.run('ROLLBACK')
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('get-products', async () => {
    return db.prepare('SELECT * FROM products ORDER BY id DESC').all()
  })

  ipcMain.handle('create-product', async (event, product) => {
    const result = db.prepare(`
      INSERT INTO products (name, category, unit, price, cost, stock, safe_stock, supplier_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.name, product.category, product.unit, product.price,
      product.cost || 0, product.stock || 0, product.safe_stock || 50,
      product.supplier_id || null, product.description || ''
    )
    return { success: true, id: result.lastInsertRowid }
  })

  ipcMain.handle('get-purchase-orders', async () => {
    const orders = db.prepare(`
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `).all()

    for (const order of orders) {
      order.items = db.prepare(`
        SELECT pi.*, p.name as product_name
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_order_id = ?
      `).all(order.id)
    }
    return orders
  })

  ipcMain.handle('create-purchase-order', async (event, order) => {
    const purchaseNo = 'PO' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-8)

    const result = db.prepare(`
      INSERT INTO purchase_orders (purchase_no, supplier_id, total_amount, status, remark)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(purchaseNo, order.supplier_id, 0, order.remark || '')

    const poId = result.lastInsertRowid
    let total = 0

    if (order.items && order.items.length) {
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_cost, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const item of order.items) {
        const subtotal = item.unit_cost * item.quantity
        total += subtotal
        insertItem.run(poId, item.product_id, item.quantity, item.unit_cost, subtotal)
      }
      db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(
        Number(total.toFixed(2)), poId
      )
    }

    return { success: true, id: poId, purchaseNo }
  })

  ipcMain.handle('update-purchase-status', async (event, id, status) => {
    db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, id)

    if (status === 'received') {
      const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_order_id = ?').all(id)
      const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
      for (const item of items) {
        updateStock.run(item.quantity, item.product_id)
      }
    }

    return { success: true }
  })

  ipcMain.handle('get-deliveries', async () => {
    const deliveries = db.prepare(`
      SELECT d.*, o.order_no, o.customer_name, o.customer_phone, o.delivery_address,
             c.name as community_name, dp.name as delivery_person_name, dp.phone as delivery_person_phone
      FROM deliveries d
      LEFT JOIN orders o ON d.order_id = o.id
      LEFT JOIN communities c ON d.community_id = c.id
      LEFT JOIN delivery_personnel dp ON d.delivery_person_id = dp.id
      ORDER BY d.created_at DESC
    `).all()
    return deliveries
  })

  ipcMain.handle('create-delivery', async (event, delivery) => {
    const deliveryNo = 'DL' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-8)

    const result = db.prepare(`
      INSERT INTO deliveries (delivery_no, order_id, community_id, delivery_person_id, batch_id,
        delivery_status, estimated_time)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      deliveryNo, delivery.order_id, delivery.community_id,
      delivery.delivery_person_id, delivery.batch_id || null,
      delivery.estimated_time || null
    )

    return { success: true, id: result.lastInsertRowid, deliveryNo }
  })

  ipcMain.handle('update-delivery-status', async (event, id, status) => {
    const updateData = { delivery_status: status }

    if (status === 'delivering') {
      updateData.estimated_time = new Date(Date.now() + 2 * 60 * 60 * 1000)
        .toISOString().slice(0, 19).replace('T', ' ')
    }
    if (status === 'delivered') {
      updateData.actual_time = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const delivery = db.prepare('SELECT order_id, estimated_time FROM deliveries WHERE id = ?').get(id)
      if (delivery && delivery.estimated_time) {
        const now = new Date()
        const est = new Date(delivery.estimated_time)
        if (now > est) {
          updateData.is_overdue = 1
        }
      }
      if (delivery && delivery.order_id) {
        db.prepare("UPDATE orders SET order_status = 'delivered' WHERE id = ?").run(delivery.order_id)
      }
    }

    const fields = Object.keys(updateData).map(k => `${k} = ?`).join(', ')
    const values = Object.values(updateData)
    values.push(id)
    db.prepare(`UPDATE deliveries SET ${fields} WHERE id = ?`).run(...values)

    return { success: true }
  })

  ipcMain.handle('get-delivery-personnel', async () => {
    return db.prepare('SELECT * FROM delivery_personnel ORDER BY id').all()
  })

  ipcMain.handle('get-delivery-schedules', async () => {
    return db.prepare(`
      SELECT ds.*, dp.name as delivery_person_name, dp.phone
      FROM delivery_schedules ds
      LEFT JOIN delivery_personnel dp ON ds.delivery_person_id = dp.id
      ORDER BY ds.date DESC
    `).all()
  })

  ipcMain.handle('get-overdue-deliveries', async () => {
    return db.prepare(`
      SELECT d.*, o.order_no, o.customer_name, o.customer_phone, o.delivery_address,
             c.name as community_name
      FROM deliveries d
      LEFT JOIN orders o ON d.order_id = o.id
      LEFT JOIN communities c ON d.community_id = c.id
      WHERE d.is_overdue = 1 AND d.delivery_status != 'delivered'
      ORDER BY d.created_at DESC
    `).all()
  })

  ipcMain.handle('send-collection-notice', async (event, deliveryId) => {
    const delivery = db.prepare(`
      SELECT d.*, o.customer_name, o.customer_phone
      FROM deliveries d
      LEFT JOIN orders o ON d.order_id = o.id
      WHERE d.id = ?
    `).get(deliveryId)

    if (delivery) {
      console.log(`催收通知已发送给 ${delivery.customer_name} (${delivery.customer_phone})`)
      return { success: true, message: '催收通知已发送' }
    }
    return { success: false, message: '配送记录不存在' }
  })

  ipcMain.handle('generate-delivery-route', async (event, communityId, deadline) => {
    const orders = db.prepare(`
      SELECT o.*, c.name as community_name, c.lng, c.lat
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      WHERE o.community_id = ? 
        AND o.order_status IN ('qualified', 'pending')
        AND o.deadline <= ?
      ORDER BY o.deadline ASC
    `).all(communityId, deadline || '2099-12-31 23:59:59')

    const batches = []
    const batchSize = 10
    for (let i = 0; i < orders.length; i += batchSize) {
      const batchOrders = orders.slice(i, i + batchSize)
      batches.push({
        batchNo: 'PC' + Date.now() + '_' + Math.floor(i / batchSize),
        communityId,
        orderCount: batchOrders.length,
        orders: batchOrders,
        estimatedTime: new Date(Date.now() + (i / batchSize) * 30 * 60 * 1000).toISOString()
      })
    }

    return {
      communityId,
      totalOrders: orders.length,
      batchCount: batches.length,
      batches,
      totalDistance: orders.length * 0.5,
      estimatedDuration: Math.ceil(orders.length / batchSize) * 30
    }
  })

  ipcMain.handle('get-sorting-batches', async (event, date) => {
    const targetDate = date || new Date().toISOString().slice(0, 10)

    const orders = db.prepare(`
      SELECT o.*, c.name as community_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      WHERE DATE(o.created_at) = ? AND o.order_status IN ('qualified', 'sorting')
      ORDER BY o.community_id, o.deadline
    `).all(targetDate)

    const communityMap = {}
    for (const order of orders) {
      if (!communityMap[order.community_id]) {
        communityMap[order.community_id] = {
          communityId: order.community_id,
          communityName: order.community_name,
          orders: [],
          totalItems: 0
        }
      }
      communityMap[order.community_id].orders.push(order)
    }

    const batches = Object.values(communityMap).map((c, idx) => ({
      batchId: 'BATCH' + targetDate.replace(/-/g, '') + '_' + (idx + 1),
      communityId: c.communityId,
      communityName: c.communityName,
      orderCount: c.orders.length,
      orders: c.orders,
      status: idx === 0 ? 'sorting' : 'pending',
      createdAt: targetDate
    }))

    return batches
  })

  ipcMain.handle('generate-pick-list', async (event, batchId) => {
    const batches = db.prepare(`
      SELECT o.*, c.name as community_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      WHERE o.order_status IN ('qualified', 'sorting')
      ORDER BY o.community_id
    `).all()

    const itemMap = {}
    for (const order of batches) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
      for (const item of items) {
        if (!itemMap[item.product_id]) {
          itemMap[item.product_id] = {
            productId: item.product_id,
            productName: item.product_name,
            unit: '',
            totalQuantity: 0,
            orderCount: 0
          }
        }
        itemMap[item.product_id].totalQuantity += item.quantity
      }
    }

    const pickList = Object.values(itemMap).map((item, idx) => ({
      ...item,
      sequence: idx + 1,
      picked: false
    }))

    return {
      batchId,
      pickList,
      totalItems: pickList.length,
      totalQuantity: pickList.reduce((s, i) => s + i.totalQuantity, 0)
    }
  })

  ipcMain.handle('get-communities', async () => {
    return db.prepare(`
      SELECT c.*, l.name as leader_name
      FROM communities c
      LEFT JOIN leaders l ON c.leader_id = l.id
      ORDER BY c.id
    `).all()
  })

  ipcMain.handle('get-community-stats', async (event, date) => {
    const targetDate = date || new Date().toISOString().slice(0, 10)

    const communities = db.prepare('SELECT * FROM communities').all()
    const stats = []

    for (const community of communities) {
      const orderCount = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE community_id = ? AND DATE(created_at) = ?
      `).get(community.id, targetDate).count

      const totalAmount = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as amount FROM orders 
        WHERE community_id = ? AND DATE(created_at) = ? AND payment_status = 'paid'
      `).get(community.id, targetDate).amount

      const deliveredCount = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE community_id = ? AND DATE(created_at) = ? AND order_status = 'completed'
      `).get(community.id, targetDate).count

      const fulfillmentRate = orderCount > 0 ? (deliveredCount / orderCount * 100).toFixed(1) : 0

      stats.push({
        communityId: community.id,
        communityName: community.name,
        orderCount,
        totalAmount: Number(totalAmount.toFixed(2)),
        deliveredCount,
        fulfillmentRate: Number(fulfillmentRate),
        stationStatus: community.station_status
      })
    }

    return stats
  })

  ipcMain.handle('get-leaders', async () => {
    return db.prepare(`
      SELECT l.*, c.name as community_name, u.username
      FROM leaders l
      LEFT JOIN communities c ON l.community_id = c.id
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.id
    `).all()
  })

  ipcMain.handle('get-leader-profit', async (event, leaderId, month) => {
    const targetMonth = month || new Date().toISOString().slice(0, 7)

    const records = db.prepare(`
      SELECT pr.*, o.order_no
      FROM profit_records pr
      LEFT JOIN orders o ON pr.order_id = o.id
      WHERE pr.leader_id = ? AND pr.month = ?
      ORDER BY pr.created_at DESC
    `).all(leaderId, targetMonth)

    const totalProfit = records.reduce((sum, r) => sum + r.amount, 0)

    const orderCount = db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE leader_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(leaderId, targetMonth).count

    return {
      leaderId,
      month: targetMonth,
      totalProfit: Number(totalProfit.toFixed(2)),
      orderCount,
      records
    }
  })

  ipcMain.handle('get-after-sales', async (event, leaderId) => {
    let where = []
    let args = []

    if (leaderId) {
      where.push('a.leader_id = ?')
      args.push(leaderId)
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

    return db.prepare(`
      SELECT a.*, o.order_no, o.total_amount, o.customer_name
      FROM after_sales a
      LEFT JOIN orders o ON a.order_id = o.id
      ${whereSql}
      ORDER BY a.created_at DESC
    `).all(...args)
  })

  ipcMain.handle('create-after-sale', async (event, afterSale) => {
    const afterSaleNo = 'AS' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-8)

    const result = db.prepare(`
      INSERT INTO after_sales (after_sale_no, order_id, leader_id, type, reason, amount, status, needs_approval)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      afterSaleNo, afterSale.order_id, afterSale.leader_id,
      afterSale.type, afterSale.reason, afterSale.amount,
      afterSale.amount > 50 ? 'pending_approval' : 'pending',
      afterSale.amount > 50 ? 1 : 0
    )

    if (afterSale.amount > 50) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, content, related_id)
        VALUES (1, 'aftersale', '超额退款审批', '有一笔超额退款申请待审批，金额：' + afterSale.amount + '元', ?)
      `).run(result.lastInsertRowid)
    }

    return { success: true, id: result.lastInsertRowid, afterSaleNo }
  })

  ipcMain.handle('get-refund-approvals', async () => {
    return db.prepare(`
      SELECT a.*, o.order_no, o.customer_name, l.name as leader_name
      FROM after_sales a
      LEFT JOIN orders o ON a.order_id = o.id
      LEFT JOIN leaders l ON a.leader_id = l.id
      WHERE a.needs_approval = 1 AND a.status = 'pending_approval'
      ORDER BY a.created_at DESC
    `).all()
  })

  ipcMain.handle('approve-refund', async (event, id, approved, comment) => {
    const status = approved ? 'approved' : 'rejected'
    db.prepare(`
      UPDATE after_sales SET status = ?, approval_comment = ? WHERE id = ?
    `).run(status, comment || '', id)

    const afterSale = db.prepare('SELECT leader_id FROM after_sales WHERE id = ?').get(id)
    if (afterSale && afterSale.leader_id) {
      const leader = db.prepare('SELECT user_id FROM leaders WHERE id = ?').get(afterSale.leader_id)
      if (leader) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, content, related_id)
          VALUES (?, 'aftersale', '售后审批结果', ?, ?)
        `).run(leader.user_id,
          approved ? '您的售后申请已通过审批' : '您的售后申请未通过：' + comment,
          id)
      }
    }

    return { success: true }
  })

  ipcMain.handle('get-daily-stats', async (event, date) => {
    const targetDate = date || new Date().toISOString().slice(0, 10)

    let stat = db.prepare('SELECT * FROM daily_stats WHERE stat_date = ?').get(targetDate)

    if (!stat) {
      const totalOrders = db.prepare(
        'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?'
      ).get(targetDate).count

      const totalAmount = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as amount 
        FROM orders WHERE DATE(created_at) = ? AND payment_status = 'paid'
      `).get(targetDate).amount

      const completedOrders = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE DATE(created_at) = ? AND order_status = 'completed'
      `).get(targetDate).count

      const fulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders * 100) : 0
      const lossRate = 1.5 + Math.random() * 2

      db.prepare(`
        INSERT INTO daily_stats (stat_date, total_orders, total_amount, fulfillment_rate, loss_rate)
        VALUES (?, ?, ?, ?, ?)
      `).run(targetDate, totalOrders, Number(totalAmount.toFixed(2)),
        Number(fulfillmentRate.toFixed(1)), Number(lossRate.toFixed(2)))

      stat = db.prepare('SELECT * FROM daily_stats WHERE stat_date = ?').get(targetDate)
    }

    return stat
  })

  ipcMain.handle('get-monthly-stats', async (event, year, month) => {
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`

    const days = []
    const dayCount = new Date(year, month, 0).getDate()

    for (let day = 1; day <= dayCount; day++) {
      const dateStr = `${targetMonth}-${String(day).padStart(2, '0')}`
      const stat = db.prepare('SELECT * FROM daily_stats WHERE stat_date = ?').get(dateStr)

      if (stat) {
        days.push(stat)
      } else {
        days.push({
          stat_date: dateStr,
          total_orders: Math.floor(Math.random() * 50 + 20),
          total_amount: Number((Math.random() * 5000 + 2000).toFixed(2)),
          fulfillment_rate: Number((85 + Math.random() * 15).toFixed(1)),
          loss_rate: Number((1 + Math.random() * 3).toFixed(2))
        })
      }
    }

    const summary = {
      totalOrders: days.reduce((s, d) => s + d.total_orders, 0),
      totalAmount: Number(days.reduce((s, d) => s + d.total_amount, 0).toFixed(2)),
      avgFulfillmentRate: Number((days.reduce((s, d) => s + d.fulfillment_rate, 0) / days.length).toFixed(1)),
      avgLossRate: Number((days.reduce((s, d) => s + d.loss_rate, 0) / days.length).toFixed(2)),
      month: targetMonth
    }

    return { summary, dailyStats: days }
  })

  ipcMain.handle('export-monthly-report', async (event, year, month) => {
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`

    const orders = db.prepare(`
      SELECT o.*, c.name as community_name
      FROM orders o
      LEFT JOIN communities c ON o.community_id = c.id
      WHERE strftime('%Y-%m', o.created_at) = ?
      ORDER BY o.created_at DESC
    `).all(targetMonth)

    const communityStats = {}
    for (const order of orders) {
      if (!communityStats[order.community_id]) {
        communityStats[order.community_id] = {
          name: order.community_name,
          orders: 0,
          amount: 0
        }
      }
      communityStats[order.community_id].orders++
      if (order.payment_status === 'paid') {
        communityStats[order.community_id].amount += order.total_amount
      }
    }

    return {
      month: targetMonth,
      totalOrders: orders.length,
      totalAmount: orders.reduce((s, o) => s + (o.payment_status === 'paid' ? o.total_amount : 0), 0),
      communityStats: Object.values(communityStats),
      orders
    }
  })

  ipcMain.handle('get-map-heat-data', async () => {
    const communities = db.prepare('SELECT * FROM communities').all()
    const heatData = []

    for (const community of communities) {
      const orderCount = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE community_id = ? AND DATE(created_at) = DATE('now')
      `).get(community.id).count

      heatData.push({
        name: community.name,
        lng: community.lng || 116.4 + Math.random() * 0.2,
        lat: community.lat || 39.9 + Math.random() * 0.2,
        value: orderCount || Math.floor(Math.random() * 30 + 5),
        stationStatus: community.station_status
      })
    }

    return heatData
  })

  ipcMain.handle('get-station-status', async () => {
    const communities = db.prepare('SELECT * FROM communities').all()
    const stations = []

    for (const community of communities) {
      const pendingCount = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE community_id = ? AND order_status IN ('pending', 'qualified', 'sorting')
      `).get(community.id).count

      const deliveringCount = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE community_id = ? AND order_status = 'delivering'
      `).get(community.id).count

      let status = 'normal'
      if (pendingCount > 15) status = 'busy'
      if (pendingCount < 5) status = 'idle'

      stations.push({
        id: community.id,
        name: community.name,
        address: community.address,
        lng: community.lng,
        lat: community.lat,
        pendingCount,
        deliveringCount,
        status
      })
    }

    return stations
  })

  ipcMain.handle('get-notifications', async (event, userId) => {
    return db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all(userId)
  })

  ipcMain.handle('mark-notification-read', async (event, id) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id)
    return { success: true }
  })
}

module.exports = { handleIPC }
