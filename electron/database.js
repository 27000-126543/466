const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db
let SQL

function getDataPath() {
  if (app && app.getPath) {
    return app.getPath('userData')
  }
  return './data'
}

async function initDatabase() {
  const userDataPath = getDataPath()
  const dbPath = path.join(userDataPath, 'fresh_purchase.db')

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')

  createTables()
  seedData()
  saveDatabase()

  return db
}

function saveDatabase() {
  if (!db) return
  try {
    const userDataPath = getDataPath()
    const dbPath = path.join(userDataPath, 'fresh_purchase.db')
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('保存数据库失败:', e)
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS communities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      lng REAL,
      lat REAL,
      leader_id INTEGER,
      station_status TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leaders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      id_card TEXT,
      community_id INTEGER,
      profit_rate REAL DEFAULT 0.08,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      price REAL NOT NULL,
      cost REAL,
      stock INTEGER DEFAULT 0,
      safe_stock INTEGER DEFAULT 50,
      supplier_id INTEGER,
      image TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      leader_id INTEGER,
      community_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      delivery_address TEXT,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      order_status TEXT DEFAULT 'pending',
      address_verified INTEGER DEFAULT 0,
      deadline DATETIME,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      vehicle_type TEXT,
      vehicle_no TEXT,
      status TEXT DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS delivery_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_person_id INTEGER,
      date DATE,
      shift_start TIME,
      shift_end TIME,
      area TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_no TEXT UNIQUE NOT NULL,
      order_id INTEGER,
      community_id INTEGER,
      delivery_person_id INTEGER,
      batch_id INTEGER,
      delivery_status TEXT DEFAULT 'pending',
      estimated_time DATETIME,
      actual_time DATETIME,
      is_overdue INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sorting_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      batch_date DATE,
      community_id INTEGER,
      total_orders INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_no TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS after_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      after_sale_no TEXT UNIQUE NOT NULL,
      order_id INTEGER,
      leader_id INTEGER,
      type TEXT,
      reason TEXT,
      amount REAL,
      status TEXT DEFAULT 'pending',
      needs_approval INTEGER DEFAULT 0,
      approval_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leader_id INTEGER,
      order_id INTEGER,
      amount REAL,
      profit_type TEXT,
      month TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      title TEXT NOT NULL,
      content TEXT,
      is_read INTEGER DEFAULT 0,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stat_date DATE UNIQUE,
      total_orders INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      fulfillment_rate REAL DEFAULT 0,
      loss_rate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

function getLastInsertId() {
  const result = db.exec('SELECT last_insert_rowid() as id')
  return result[0] ? result[0].values[0][0] : null
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function runSql(sql, params = []) {
  db.run(sql, params)
  saveDatabase()
  return { changes: db.getRowsModified(), lastInsertRowid: getLastInsertId() }
}

function seedData() {
  const userCount = queryOne('SELECT COUNT(*) as count FROM users').count
  if (userCount > 0) return

  const insertUser = (username, password, role, name, phone) => {
    return runSql(
      'INSERT INTO users (username, password, role, name, phone) VALUES (?, ?, ?, ?, ?)',
      [username, password, role, name, phone]
    )
  }
  insertUser('admin', 'admin123', 'admin', '系统管理员', '13800138000')
  insertUser('leader1', '123456', 'leader', '张团长', '13900139001')
  insertUser('leader2', '123456', 'leader', '李团长', '13900139002')

  const insertCommunity = (name, address, lng, lat, station_status) => {
    return runSql(
      'INSERT INTO communities (name, address, lng, lat, station_status) VALUES (?, ?, ?, ?, ?)',
      [name, address, lng, lat, station_status]
    )
  }
  const communities = [
    ['阳光花园', '朝阳区阳光路88号', 116.489, 39.928, 'busy'],
    ['幸福里小区', '海淀区幸福街66号', 116.325, 39.967, 'normal'],
    ['绿城家园', '丰台区绿城市政路12号', 116.286, 39.856, 'idle'],
    ['金茂府', '朝阳区金茂路18号', 116.478, 39.915, 'busy'],
    ['万科城市花园', '昌平区万科路8号', 116.234, 40.123, 'normal']
  ]
  communities.forEach(c => insertCommunity(...c))

  const insertLeader = (user_id, name, phone, community_id, profit_rate) => {
    return runSql(
      'INSERT INTO leaders (user_id, name, phone, community_id, profit_rate) VALUES (?, ?, ?, ?, ?)',
      [user_id, name, phone, community_id, profit_rate]
    )
  }
  insertLeader(2, '张团长', '13900139001', 1, 0.08)
  insertLeader(3, '李团长', '13900139002', 2, 0.1)

  const insertSupplier = (name, contact_person, phone, address) => {
    return runSql(
      'INSERT INTO suppliers (name, contact_person, phone, address) VALUES (?, ?, ?, ?)',
      [name, contact_person, phone, address]
    )
  }
  const suppliers = [
    ['绿源蔬菜基地', '王经理', '13700137001', '山东省寿光市蔬菜产业园'],
    ['新鲜水果直供', '李总', '13700137002', '广东省广州市江南果菜批发市场'],
    ['肉类联合加工厂', '张厂长', '13700137003', '河南省郑州市食品工业园'],
    ['水产养殖合作社', '陈社长', '13700137004', '浙江省舟山市水产养殖基地']
  ]
  suppliers.forEach(s => insertSupplier(...s))

  const insertProduct = (name, category, unit, price, cost, stock, safe_stock, supplier_id, description) => {
    return runSql(
      'INSERT INTO products (name, category, unit, price, cost, stock, safe_stock, supplier_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category, unit, price, cost, stock, safe_stock, supplier_id, description]
    )
  }
  const products = [
    ['有机白菜', '蔬菜', '斤', 3.5, 1.8, 200, 50, 1, '山东有机种植基地直供'],
    ['西红柿', '蔬菜', '斤', 5.8, 3.2, 150, 40, 1, '自然成熟，口感酸甜'],
    ['黄瓜', '蔬菜', '斤', 4.2, 2.0, 180, 45, 1, '顶花带刺，新鲜脆嫩'],
    ['土豆', '蔬菜', '斤', 2.8, 1.2, 300, 80, 1, '黄心土豆，粉糯香甜'],
    ['红富士苹果', '水果', '斤', 8.9, 5.0, 200, 60, 2, '陕西洛川红富士'],
    ['香蕉', '水果', '斤', 6.5, 3.5, 120, 30, 2, '菲律宾进口香蕉'],
    ['橙子', '水果', '斤', 7.8, 4.2, 160, 50, 2, '赣南脐橙，汁多味甜'],
    ['葡萄', '水果', '斤', 12.8, 7.5, 80, 25, 2, '阳光玫瑰葡萄'],
    ['猪五花肉', '肉类', '斤', 22.8, 15.0, 100, 30, 3, '散养黑猪五花肉'],
    ['鸡胸肉', '肉类', '斤', 13.9, 8.5, 150, 40, 3, '低脂高蛋白鸡胸肉'],
    ['鸡蛋', '蛋类', '盒', 15.8, 9.0, 200, 60, 3, '农家散养土鸡蛋30枚'],
    ['鲫鱼', '水产', '斤', 18.8, 10.0, 60, 20, 4, '活鱼现杀，新鲜直达'],
    ['虾', '水产', '斤', 45.8, 28.0, 40, 15, 4, '深海大虾，肉质紧实'],
    ['牛奶', '乳品', '箱', 58.0, 38.0, 100, 30, 1, '纯牛奶250ml*24盒'],
    ['酸奶', '乳品', '箱', 65.0, 42.0, 80, 25, 1, '原味酸奶100g*20杯']
  ]
  products.forEach(p => insertProduct(...p))

  const insertDeliveryPerson = (name, phone, vehicle_type, vehicle_no, status) => {
    return runSql(
      'INSERT INTO delivery_personnel (name, phone, vehicle_type, vehicle_no, status) VALUES (?, ?, ?, ?, ?)',
      [name, phone, vehicle_type, vehicle_no, status]
    )
  }
  const deliveryPersons = [
    ['王师傅', '13600136001', '电动三轮车', '京A12345', 'available'],
    ['李师傅', '13600136002', '电动三轮车', '京A12346', 'available'],
    ['张师傅', '13600136003', '面包车', '京B88888', 'delivering'],
    ['刘师傅', '13600136004', '电动三轮车', '京A12347', 'available']
  ]
  deliveryPersons.forEach(d => insertDeliveryPerson(...d))

  const orderPrefix = 'DD' + new Date().getFullYear().toString().slice(-2)
  let orderNoIndex = 1001

  function generateOrderNo() {
    return orderPrefix + (orderNoIndex++).toString().padStart(6, '0')
  }

  const insertOrder = (order_no, leader_id, community_id, customer_name, customer_phone, delivery_address, total_amount, payment_status, order_status, address_verified, deadline, remark) => {
    return runSql(
      `INSERT INTO orders (order_no, leader_id, community_id, customer_name, customer_phone, 
       delivery_address, total_amount, payment_status, order_status, address_verified, deadline, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_no, leader_id, community_id, customer_name, customer_phone, delivery_address, total_amount, payment_status, order_status, address_verified, deadline, remark]
    )
  }

  const insertOrderItem = (order_id, product_id, product_name, quantity, unit_price, subtotal) => {
    return runSql(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, product_id, product_name, quantity, unit_price, subtotal]
    )
  }

  const today = new Date()
  for (let i = 0; i < 20; i++) {
    const communityId = (i % 5) + 1
    const leaderId = communityId <= 2 ? communityId : 1
    const isPaid = Math.random() > 0.2 ? 1 : 0
    const statuses = ['pending', 'sorting', 'delivering', 'delivered', 'completed']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const addrVerified = Math.random() > 0.1 ? 1 : 0

    const deadline = new Date(today.getTime() + (2 - (i % 3)) * 24 * 60 * 60 * 1000)

    const customerNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '陈十二']
    const customerName = customerNames[i % customerNames.length]
    const customerPhone = '13800' + (100000 + i).toString().padStart(5, '0')

    const orderNo = generateOrderNo()
    const result = insertOrder(
      orderNo,
      leaderId,
      communityId,
      customerName,
      customerPhone,
      `小区${i % 5 + 1}号楼${(i % 10) + 1}单元${101 + i}室`,
      0,
      isPaid ? 'paid' : 'unpaid',
      status,
      addrVerified,
      deadline.toISOString().slice(0, 19).replace('T', ' '),
      i % 7 === 0 ? '请放在自提点' : ''
    )

    const orderId = result.lastInsertRowid
    let totalAmount = 0

    const itemCount = 2 + Math.floor(Math.random() * 5)
    for (let j = 0; j < itemCount; j++) {
      const productId = 1 + Math.floor(Math.random() * 15)
      const product = queryOne('SELECT name, price FROM products WHERE id = ?', [productId])
      if (!product) continue
      const qty = 1 + Math.floor(Math.random() * 5)
      const subtotal = Number((product.price * qty).toFixed(2))
      totalAmount += subtotal

      insertOrderItem(orderId, productId, product.name, qty, product.price, subtotal)
    }

    runSql('UPDATE orders SET total_amount = ? WHERE id = ?', [
      Number(totalAmount.toFixed(2)), orderId
    ])

    if (status === 'completed') {
      const profit = Number((totalAmount * 0.08).toFixed(2))
      const month = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0')
      runSql(
        'INSERT INTO profit_records (leader_id, order_id, amount, profit_type, month) VALUES (?, ?, ?, ?, ?)',
        [leaderId, orderId, profit, 'order', month]
      )
    }
  }

  const insertAfterSale = (after_sale_no, order_id, leader_id, type, reason, amount, status, needs_approval) => {
    return runSql(
      `INSERT INTO after_sales (after_sale_no, order_id, leader_id, type, reason, amount, status, needs_approval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [after_sale_no, order_id, leader_id, type, reason, amount, status, needs_approval]
    )
  }

  for (let i = 0; i < 5; i++) {
    const orderId = 15 + i
    const order = queryOne('SELECT total_amount, leader_id FROM orders WHERE id = ?', [orderId])
    if (!order) continue

    const types = ['return', 'exchange', 'refund']
    const type = types[i % types.length]
    const amount = Number((order.total_amount * (0.2 + Math.random() * 0.5)).toFixed(2))
    const needsApproval = amount > 50 ? 1 : 0
    const statuses = needsApproval ? ['pending_approval', 'pending', 'processing'] : ['pending', 'processing', 'completed']
    const status = statuses[i % statuses.length]

    insertAfterSale(
      'AS' + (2001 + i).toString().padStart(6, '0'),
      orderId,
      order.leader_id,
      type,
      ['商品不新鲜', '包装破损', '数量不足', '质量问题', '发错货'][i],
      amount,
      status,
      needsApproval
    )
  }

  const insertPurchaseOrder = (purchase_no, supplier_id, total_amount, status, remark) => {
    return runSql(
      'INSERT INTO purchase_orders (purchase_no, supplier_id, total_amount, status, remark) VALUES (?, ?, ?, ?, ?)',
      [purchase_no, supplier_id, total_amount, status, remark]
    )
  }
  const insertPurchaseItem = (purchase_order_id, product_id, quantity, unit_cost, subtotal) => {
    return runSql(
      'INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?)',
      [purchase_order_id, product_id, quantity, unit_cost, subtotal]
    )
  }

  for (let i = 0; i < 4; i++) {
    const supplierId = i + 1
    let total = 0
    const result = insertPurchaseOrder(
      'PO' + (3001 + i).toString().padStart(6, '0'),
      supplierId,
      0,
      i === 0 ? 'received' : i === 1 ? 'shipping' : 'pending',
      ''
    )
    const poId = result.lastInsertRowid

    for (let j = 0; j < 3; j++) {
      const productId = i * 4 + j + 1
      const product = queryOne('SELECT cost FROM products WHERE id = ?', [productId])
      if (!product) continue
      const qty = 50 + Math.floor(Math.random() * 100)
      const subtotal = product.cost * qty
      total += subtotal
      insertPurchaseItem(poId, productId, qty, product.cost, subtotal)
    }

    runSql('UPDATE purchase_orders SET total_amount = ? WHERE id = ?', [
      Number(total.toFixed(2)), poId
    ])
  }

  const insertNotification = (user_id, type, title, content, related_id) => {
    return runSql(
      'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, type, title, content, related_id]
    )
  }
  insertNotification(1, 'system', '系统欢迎消息', '欢迎使用社区生鲜团购智能调度与库存管理系统', null)
  insertNotification(1, 'warning', '库存预警', '有机白菜库存已低于安全库存，请及时补货', 1)
  insertNotification(2, 'order', '新订单提醒', '您有5笔新订单待处理', null)
  insertNotification(2, 'aftersale', '售后通知', '有2笔售后申请待审核', null)
}

function prepare(sql) {
  const stmt = db.prepare(sql)

  return {
    run(...params) {
      stmt.reset()
      stmt.bind(params)
      stmt.step()
      stmt.free()
      saveDatabase()
      return {
        changes: db.getRowsModified(),
        lastInsertRowid: getLastInsertId()
      }
    },
    get(...params) {
      stmt.reset()
      stmt.bind(params)
      let result = null
      if (stmt.step()) {
        result = stmt.getAsObject()
      }
      stmt.free()
      return result
    },
    all(...params) {
      stmt.reset()
      stmt.bind(params)
      const results = []
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      stmt.free()
      return results
    }
  }
}

function getDb() {
  return {
    prepare,
    exec: (sql) => {
      db.run(sql)
      saveDatabase()
    },
    run: (sql, params = []) => {
      db.run(sql, params)
      saveDatabase()
    },
    pragma: (sql) => {
      db.run('PRAGMA ' + sql)
    }
  }
}

module.exports = { initDatabase, getDb, queryOne, queryAll, runSql, saveDatabase }
