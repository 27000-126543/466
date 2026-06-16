<template>
  <el-container class="main-layout">
    <el-aside :width="sidebarWidth" class="sidebar">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><Shop /></el-icon>
        <span v-show="!isCollapse" class="logo-text">生鲜团购系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="sidebarBg"
        :text-color="'#bfcbd9'"
        :active-text-color="'#409eff'"
        router
        class="sidebar-menu"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item v-if="!item.meta?.hidden" :index="item.path">
            <el-icon><component :is="item.meta?.icon || 'Menu'" /></el-icon>
            <template #title>{{ item.meta?.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
            <el-button type="primary" text @click="showNotifications = true">
              <el-icon :size="20"><Bell /></el-icon>
            </el-button>
          </el-badge>
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :icon="UserFilled" />
              <span class="username">{{ userStore.userName }}</span>
              <el-tag size="small" :type="userRoleTagType">
                {{ userRoleText }}
              </el-tag>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <el-drawer
      v-model="showNotifications"
      title="消息通知"
      direction="rtl"
      size="400px"
    >
      <div v-if="notifications.length === 0" class="empty-notifications">
        <el-empty description="暂无通知" />
      </div>
      <div v-else class="notification-list">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.is_read }"
          @click="markAsRead(item.id)"
        >
          <div class="notification-header">
            <span class="notification-title">{{ item.title }}</span>
            <span class="notification-time">{{ formatTime(item.created_at) }}</span>
          </div>
          <div class="notification-content">{{ item.content }}</div>
        </div>
      </div>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Shop, Fold, Expand, Bell, User, SwitchButton, UserFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const sidebarWidth = computed(() => isCollapse.value ? '64px' : '220px')
const sidebarBg = '#001529'
const showNotifications = ref(false)
const notifications = ref([])
const unreadCount = ref(0)

const adminMenus = [
  { path: '/dashboard', meta: { title: '数据概览', icon: 'DataAnalysis' } },
  { path: '/orders', meta: { title: '订单管理', icon: 'Document' } },
  { path: '/unqualified-orders', meta: { title: '不合格订单', icon: 'Warning' } },
  { path: '/dispatch', meta: { title: '智能调度', icon: 'Operation' } },
  { path: '/sorting', meta: { title: '分拣批次', icon: 'Tickets' } },
  { path: '/inventory', meta: { title: '库存管理', icon: 'Goods' } },
  { path: '/low-stock', meta: { title: '库存预警', icon: 'Bell' } },
  { path: '/purchase', meta: { title: '补货订单', icon: 'ShoppingCart' } },
  { path: '/delivery', meta: { title: '配送管理', icon: 'Van' } },
  { path: '/overdue-delivery', meta: { title: '超时催收', icon: 'AlarmClock' } },
  { path: '/after-sale', meta: { title: '售后管理', icon: 'Service' } },
  { path: '/refund-approval', meta: { title: '退款审批', icon: 'CircleCheck' } },
  { path: '/statistics', meta: { title: '数据统计', icon: 'TrendCharts' } },
  { path: '/monthly-report', meta: { title: '月度报告', icon: 'PieChart' } },
  { path: '/map', meta: { title: '小区地图', icon: 'Location' } },
  { path: '/communities', meta: { title: '小区管理', icon: 'OfficeBuilding' } },
  { path: '/leaders', meta: { title: '团长管理', icon: 'User' } }
]

const leaderMenus = [
  { path: '/dashboard', meta: { title: '数据概览', icon: 'DataAnalysis' } },
  { path: '/leader-orders', meta: { title: '我的订单', icon: 'Document' } },
  { path: '/profit', meta: { title: '分润明细', icon: 'Money' } },
  { path: '/after-sale', meta: { title: '售后管理', icon: 'Service' } }
]

const menuItems = computed(() => {
  return userStore.userRole === 'admin' ? adminMenus : leaderMenus
})

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta?.title || '首页')

const userRoleText = computed(() => {
  return userStore.userRole === 'admin' ? '运营主管' : '团长'
})

const userRoleTagType = computed(() => {
  return userStore.userRole === 'admin' ? 'danger' : 'success'
})

function toggleSidebar() {
  isCollapse.value = !isCollapse.value
}

function handleCommand(command) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    }).catch(() => {})
  }
}

function formatTime(time) {
  if (!time) return ''
  return time.slice(5, 16).replace('T', ' ')
}

async function loadNotifications() {
  if (window.electronAPI) {
    const data = await window.electronAPI.getNotifications(userStore.user.id)
    notifications.value = data
    unreadCount.value = data.filter(n => !n.is_read).length
  }
}

async function markAsRead(id) {
  if (window.electronAPI) {
    await window.electronAPI.markNotificationRead(id)
    loadNotifications()
  }
}

onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
.main-layout {
  height: 100%;
  width: 100%;
}

.sidebar {
  background: #001529;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #1f3a5f;
}

.logo-text {
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(64, 158, 255, 0.1);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(64, 158, 255, 0.2);
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.collapse-btn:hover {
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.notification-badge {
  margin-right: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.username {
  font-size: 14px;
  color: #303133;
}

.main-content {
  padding: 0;
  background: #f5f7fa;
  overflow: hidden;
}

.empty-notifications {
  padding: 40px 0;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  padding: 12px;
  border-radius: 6px;
  background: #f5f7fa;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #ecf5ff;
}

.notification-item.unread {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.notification-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
