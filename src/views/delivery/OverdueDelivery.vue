<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon color="#f56c6c"><AlarmClock /></el-icon>
        超时催收
      </h2>
      <el-button type="danger" @click="sendAllReminders" :disabled="overdueDeliveries.length === 0">
        <el-icon><Message /></el-icon>
        一键催收全部
      </el-button>
    </div>

    <div class="warning-banner">
      <el-icon :size="20"><Warning /></el-icon>
      <span>当前共有 <b>{{ overdueDeliveries.length }}</b> 笔超时未签收订单，请及时处理</span>
    </div>

    <div class="table-container">
      <el-table :data="overdueDeliveries" v-loading="loading" stripe>
        <el-table-column prop="delivery_no" label="配送单号" width="140" />
        <el-table-column prop="order_no" label="订单号" width="140" />
        <el-table-column prop="community_name" label="小区" width="120" />
        <el-table-column prop="customer_name" label="客户姓名" width="100" />
        <el-table-column prop="customer_phone" label="联系电话" width="130" />
        <el-table-column prop="delivery_address" label="收货地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="estimated_time" label="预计送达" width="160" />
        <el-table-column label="超时时长" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 500;">
              {{ getOverdueDuration(row.estimated_time) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="配送状态" width="100">
          <template #default="{ row }">
            <el-tag type="danger" size="small">已超时</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="callCustomer(row)">
              电话联系
            </el-button>
            <el-button type="warning" link size="small" @click="sendReminder(row)">
              发送催收
            </el-button>
            <el-button type="success" link size="small" @click="confirmReceived(row)">
              确认签收
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-empty v-if="!loading && overdueDeliveries.length === 0" description="暂无超时订单" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { AlarmClock, Message, Warning } from '@element-plus/icons-vue'

const overdueDeliveries = ref([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    if (window.electronAPI) {
      overdueDeliveries.value = await window.electronAPI.getOverdueDeliveries()
    } else {
      overdueDeliveries.value = [
        {
          id: 1,
          delivery_no: 'DL240005',
          order_no: 'DD240005',
          community_name: '阳光花园',
          customer_name: '张三',
          customer_phone: '13800138001',
          delivery_address: '阳光花园1号楼1单元101室',
          estimated_time: '2024-06-16 14:30:00'
        },
        {
          id: 2,
          delivery_no: 'DL240008',
          order_no: 'DD240008',
          community_name: '幸福里小区',
          customer_name: '李四',
          customer_phone: '13800138002',
          delivery_address: '幸福里小区3号楼2单元302室',
          estimated_time: '2024-06-16 15:00:00'
        }
      ]
    }
  } finally {
    loading.value = false
  }
}

function getOverdueDuration(estimatedTime) {
  if (!estimatedTime) return ''
  const est = new Date(estimatedTime)
  const now = new Date()
  const diff = now.getTime() - est.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}小时${minutes}分钟`
}

function callCustomer(row) {
  ElMessage.info('正在拨打：' + row.customer_phone)
}

async function sendReminder(row) {
  if (window.electronAPI) {
    await window.electronAPI.sendCollectionNotice(row.id)
  }
  ElMessage.success('催收通知已发送给 ' + row.customer_name)
}

function sendAllReminders() {
  ElMessage.success(`已向 ${overdueDeliveries.value.length} 位客户发送催收通知`)
}

function confirmReceived(row) {
  const index = overdueDeliveries.value.findIndex(d => d.id === row.id)
  if (index > -1) {
    overdueDeliveries.value.splice(index, 1)
  }
  ElMessage.success('已确认签收')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-banner {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f56c6c;
  font-size: 14px;
}

.warning-banner b {
  font-size: 18px;
  margin: 0 4px;
}
</style>
