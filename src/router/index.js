import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据概览', icon: 'DataAnalysis' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/OrderList.vue'),
        meta: { title: '订单管理', icon: 'Document', roles: ['admin'] }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/orders/OrderDetail.vue'),
        meta: { title: '订单详情', hidden: true }
      },
      {
        path: 'unqualified-orders',
        name: 'UnqualifiedOrders',
        component: () => import('@/views/orders/UnqualifiedOrders.vue'),
        meta: { title: '不合格订单', icon: 'Warning', roles: ['admin'] }
      },
      {
        path: 'dispatch',
        name: 'Dispatch',
        component: () => import('@/views/dispatch/DispatchCenter.vue'),
        meta: { title: '智能调度', icon: 'Operation', roles: ['admin'] }
      },
      {
        path: 'sorting',
        name: 'Sorting',
        component: () => import('@/views/dispatch/SortingBatches.vue'),
        meta: { title: '分拣批次', icon: 'Tickets', roles: ['admin'] }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/InventoryList.vue'),
        meta: { title: '库存管理', icon: 'Goods', roles: ['admin'] }
      },
      {
        path: 'low-stock',
        name: 'LowStock',
        component: () => import('@/views/inventory/LowStock.vue'),
        meta: { title: '库存预警', icon: 'Bell', roles: ['admin'] }
      },
      {
        path: 'purchase',
        name: 'Purchase',
        component: () => import('@/views/inventory/PurchaseOrders.vue'),
        meta: { title: '补货订单', icon: 'ShoppingCart', roles: ['admin'] }
      },
      {
        path: 'delivery',
        name: 'Delivery',
        component: () => import('@/views/delivery/DeliveryList.vue'),
        meta: { title: '配送管理', icon: 'Van', roles: ['admin'] }
      },
      {
        path: 'delivery-schedule',
        name: 'DeliverySchedule',
        component: () => import('@/views/delivery/DeliverySchedule.vue'),
        meta: { title: '配送员排班', icon: 'Calendar', roles: ['admin'] }
      },
      {
        path: 'overdue-delivery',
        name: 'OverdueDelivery',
        component: () => import('@/views/delivery/OverdueDelivery.vue'),
        meta: { title: '超时催收', icon: 'AlarmClock', roles: ['admin'] }
      },
      {
        path: 'leader-orders',
        name: 'LeaderOrders',
        component: () => import('@/views/leader/LeaderOrders.vue'),
        meta: { title: '我的订单', icon: 'Document', roles: ['leader'] }
      },
      {
        path: 'profit',
        name: 'Profit',
        component: () => import('@/views/leader/ProfitDetail.vue'),
        meta: { title: '分润明细', icon: 'Money', roles: ['leader'] }
      },
      {
        path: 'after-sale',
        name: 'AfterSale',
        component: () => import('@/views/leader/AfterSale.vue'),
        meta: { title: '售后管理', icon: 'Service', roles: ['leader', 'admin'] }
      },
      {
        path: 'refund-approval',
        name: 'RefundApproval',
        component: () => import('@/views/admin/RefundApproval.vue'),
        meta: { title: '退款审批', icon: 'CircleCheck', roles: ['admin'] }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/DailyStats.vue'),
        meta: { title: '数据统计', icon: 'TrendCharts', roles: ['admin'] }
      },
      {
        path: 'monthly-report',
        name: 'MonthlyReport',
        component: () => import('@/views/statistics/MonthlyReport.vue'),
        meta: { title: '月度报告', icon: 'PieChart', roles: ['admin'] }
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('@/views/map/CommunityMap.vue'),
        meta: { title: '小区地图', icon: 'Location', roles: ['admin'] }
      },
      {
        path: 'communities',
        name: 'Communities',
        component: () => import('@/views/admin/CommunityList.vue'),
        meta: { title: '小区管理', icon: 'OfficeBuilding', roles: ['admin'] }
      },
      {
        path: 'leaders',
        name: 'Leaders',
        component: () => import('@/views/admin/LeaderList.vue'),
        meta: { title: '团长管理', icon: 'User', roles: ['admin'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const isAuthenticated = userStore.isLoggedIn

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else if (to.meta.roles && isAuthenticated) {
    if (to.meta.roles.includes(userStore.user.role)) {
      next()
    } else {
      next('/dashboard')
    }
  } else {
    next()
  }
})

export default router
