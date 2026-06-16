const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('get-users'),
  login: (username, password) => ipcRenderer.invoke('login', username, password),

  getOrders: (params) => ipcRenderer.invoke('get-orders', params),
  getOrderById: (id) => ipcRenderer.invoke('get-order-by-id', id),
  createOrder: (order) => ipcRenderer.invoke('create-order', order),
  updateOrderStatus: (id, status) => ipcRenderer.invoke('update-order-status', id, status),
  validateOrder: (id) => ipcRenderer.invoke('validate-order', id),
  getOrdersByCommunity: (communityId) => ipcRenderer.invoke('get-orders-by-community', communityId),
  getUnqualifiedOrders: () => ipcRenderer.invoke('get-unqualified-orders'),
  markOrderUnqualified: (id, reason) => ipcRenderer.invoke('mark-order-unqualified', id, reason),

  getInventory: (params) => ipcRenderer.invoke('get-inventory', params),
  updateInventory: (id, data) => ipcRenderer.invoke('update-inventory', id, data),
  getLowStockProducts: () => ipcRenderer.invoke('get-low-stock-products'),
  deductStock: (orderId) => ipcRenderer.invoke('deduct-stock', orderId),
  getProducts: () => ipcRenderer.invoke('get-products'),
  createProduct: (product) => ipcRenderer.invoke('create-product', product),

  getPurchaseOrders: () => ipcRenderer.invoke('get-purchase-orders'),
  createPurchaseOrder: (order) => ipcRenderer.invoke('create-purchase-order', order),
  updatePurchaseStatus: (id, status) => ipcRenderer.invoke('update-purchase-status', id, status),

  getDeliveries: () => ipcRenderer.invoke('get-deliveries'),
  createDelivery: (delivery) => ipcRenderer.invoke('create-delivery', delivery),
  updateDeliveryStatus: (id, status) => ipcRenderer.invoke('update-delivery-status', id, status),
  getDeliveryPersonnel: () => ipcRenderer.invoke('get-delivery-personnel'),
  getDeliverySchedules: () => ipcRenderer.invoke('get-delivery-schedules'),
  getOverdueDeliveries: () => ipcRenderer.invoke('get-overdue-deliveries'),
  sendCollectionNotice: (deliveryId) => ipcRenderer.invoke('send-collection-notice', deliveryId),

  generateDeliveryRoute: (communityId, deadline) => ipcRenderer.invoke('generate-delivery-route', communityId, deadline),
  getSortingBatches: (date) => ipcRenderer.invoke('get-sorting-batches', date),
  generatePickList: (batchId) => ipcRenderer.invoke('generate-pick-list', batchId),

  getCommunities: () => ipcRenderer.invoke('get-communities'),
  getCommunityStats: (date) => ipcRenderer.invoke('get-community-stats', date),

  getLeaders: () => ipcRenderer.invoke('get-leaders'),
  getLeaderProfit: (leaderId, month) => ipcRenderer.invoke('get-leader-profit', leaderId, month),
  getAfterSales: (leaderId) => ipcRenderer.invoke('get-after-sales', leaderId),
  createAfterSale: (afterSale) => ipcRenderer.invoke('create-after-sale', afterSale),
  getRefundApprovals: () => ipcRenderer.invoke('get-refund-approvals'),
  approveRefund: (id, approved, comment) => ipcRenderer.invoke('approve-refund', id, approved, comment),

  getDailyStats: (date) => ipcRenderer.invoke('get-daily-stats', date),
  getMonthlyStats: (year, month) => ipcRenderer.invoke('get-monthly-stats', year, month),
  exportMonthlyReport: (year, month) => ipcRenderer.invoke('export-monthly-report', year, month),
  generateMonthlyPdf: (year, month) => ipcRenderer.invoke('generate-monthly-pdf', year, month),

  getMapHeatData: () => ipcRenderer.invoke('get-map-heat-data'),
  getStationStatus: () => ipcRenderer.invoke('get-station-status'),

  getNotifications: (userId) => ipcRenderer.invoke('get-notifications', userId),
  markNotificationRead: (id) => ipcRenderer.invoke('mark-notification-read', id)
})
