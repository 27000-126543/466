<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">配送管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAssignDialog = true">
          <el-icon><Plus /></el-icon>
          新建配送
        </el-button>
      </div>
    </div>

    <div class="status-overview">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="status-card pending">
            <el-icon :size="24"><Clock /></el-icon>
            <div class="status-info">
              <span class="status-num">{{ statusStats.pending }}</span>
              <span class="status-label">待配送</span>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="status-card delivering">
            <el-icon :size="24"><Van /></el-icon>
            <div class="status-info">
              <span class="status-num">{{ statusStats.delivering }}</span>
              <span class="status-label">配送中</span>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="status-card delivered">
            <el-icon :size="24"><CircleCheck /></el-icon>
            <div class="status-info">
              <span class="status-num">{{ statusStats.delivered }}</span>
              <span class="status-label">已送达</span>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="status-card overdue">
            <el-icon :size="24"><AlarmClock /></el-icon>
            <div class="status-info">
              <span class="status-num">{{ statusStats.overdue }}</span>
              <span class="status-label">已超时</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="配送状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待配送" value="pending" />
            <el-option label="配送中" value="delivering" />
            <el-option label="已送达" value="delivered" />
          </el-select>
        </el-form-item>
        <el-form-item label="配送员">
          <el-select v-model="filterForm.personId" placeholder="全部配送员" clearable style="width: 140px">
            <el-option
              v-for="p in deliveryPersonnel"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadDeliveries">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="deliveries" v-loading="loading" stripe>
        <el-table-column prop="delivery_no" label="配送单号" width="140" />
        <el-table-column prop="order_no" label="关联订单" width="140" />
        <el-table-column prop="community_name" label="小区" width="120" />
        <el-table-column prop="customer_name" label="客户" width="80" />
        <el-table-column prop="customer_phone" label="联系电话" width="130" />
        <el-table-column prop="delivery_address" label="收货地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="delivery_person_name" label="配送员" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.delivery_status)" size="small">
              {{ getStatusText(row.delivery_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="estimated_time" label="预计送达" width="160" />
        <el-table-column label="是否超时" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.is_overdue" type="danger" size="small">是</el-tag>
            <el-tag v-else type="success" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="actual_time" label="实际送达" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)" v-if="row.delivery_status === 'pending'">
              安排配送
            </el-button>
            <el-button
              v-if="row.delivery_status === 'pending'"
              type="success"
              link
              size="small"
              @click="startDelivery(row)"
            >
              开始配送
            </el-button>
            <el-button
              v-if="row.delivery_status === 'delivering'"
              type="warning"
              link
              size="small"
              @click="completeDelivery(row)"
            >
              确认送达
            </el-button>
            <el-button
              v-if="row.is_overdue && row.delivery_status !== 'delivered'"
              type="danger"
              link
              size="small"
              @click="sendReminder(row)"
            >
              催收
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showAssignDialog" title="安排配送" width="600px">
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="配送员">
          <el-select v-model="assignForm.delivery_person_id" placeholder="请选择配送员" style="width: 100%;">
            <el-option
              v-for="p in availablePersonnel"
              :key="p.id"
              :label="p.name + ' - ' + p.vehicle_type"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预计送达">
          <el-date-picker
            v-model="assignForm.estimated_time"
            type="datetime"
            placeholder="选择预计送达时间"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus, Clock, Van, CircleCheck, AlarmClock, Search, Refresh
} from '@element-plus/icons-vue'

const deliveries = ref([])
const loading = ref(false)
const deliveryPersonnel = ref([])

const filterForm = reactive({
  status: '',
  personId: ''
})

const statusStats = ref({
  pending: 0,
  delivering: 0,
  delivered: 0,
  overdue: 0
})

const showAssignDialog = ref(false)
const assignForm = reactive({
  delivery_person_id: null,
  estimated_time: ''
})

const availablePersonnel = computed(() => {
  return deliveryPersonnel.value.filter(p => p.status === 'available')
})

async function loadDeliveries() {
  loading.value = true
  try {
    if (window.electronAPI) {
      deliveries.value = await window.electronAPI.getDeliveries()
    } else {
      deliveries.value = generateMockDeliveries()
    }
    updateStats()
  } finally {
    loading.value = false
  }
}

function generateMockDeliveries() {
  const statuses = ['pending', 'delivering', 'delivered', 'delivered']
  const communities = ['阳光花园', '幸福里小区', '绿城家园', '金茂府']
  const names = ['王师傅', '李师傅', '张师傅', '刘师傅']

  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    delivery_no: 'DL' + (240001 + i),
    order_id: i + 1,
    order_no: 'DD' + (240001 + i),
    community_name: communities[i % 4],
    customer_name: '客户' + (i + 1),
    customer_phone: '138' + String(10000000 + i).padStart(8, '0'),
    delivery_address: communities[i % 4] + ' ' + (i + 1) + '号楼',
    delivery_person_id: (i % 4) + 1,
    delivery_person_name: names[i % 4],
    delivery_status: statuses[i % statuses.length],
    estimated_time: '2024-06-17 15:' + (30 + i * 5) + ':00',
    actual_time: i > 5 ? '2024-06-17 15:' + (25 + i * 5) + ':00' : null,
    is_overdue: i === 3 || i === 7 ? 1 : 0
  }))
}

function updateStats() {
  statusStats.value = {
    pending: deliveries.value.filter(d => d.delivery_status === 'pending').length,
    delivering: deliveries.value.filter(d => d.delivery_status === 'delivering').length,
    delivered: deliveries.value.filter(d => d.delivery_status === 'delivered').length,
    overdue: deliveries.value.filter(d => d.is_overdue).length
  }
}

function resetFilter() {
  filterForm.status = ''
  filterForm.personId = ''
  loadDeliveries()
}

function getStatusType(status) {
  const map = {
    pending: 'warning',
    delivering: 'primary',
    delivered: 'success'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    pending: '待配送',
    delivering: '配送中',
    delivered: '已送达'
  }
  return map[status] || status
}

async function loadPersonnel() {
  if (window.electronAPI) {
    deliveryPersonnel.value = await window.electronAPI.getDeliveryPersonnel()
  } else {
    deliveryPersonnel.value = [
      { id: 1, name: '王师傅', phone: '13600136001', vehicle_type: '电动三轮车', status: 'available' },
      { id: 2, name: '李师傅', phone: '13600136002', vehicle_type: '电动三轮车', status: 'available' },
      { id: 3, name: '张师傅', phone: '13600136003', vehicle_type: '面包车', status: 'delivering' },
      { id: 4, name: '刘师傅', phone: '13600136004', vehicle_type: '电动三轮车', status: 'available' }
    ]
  }
}

function viewDetail(row) {
  assignForm.delivery_person_id = null
  assignForm.estimated_time = ''
  showAssignDialog.value = true
}

async function confirmAssign() {
  if (!assignForm.delivery_person_id) {
    ElMessage.warning('请选择配送员')
    return
  }
  ElMessage.success('配送安排成功')
  showAssignDialog.value = false
  loadDeliveries()
}

async function startDelivery(row) {
  if (window.electronAPI) {
    await window.electronAPI.updateDeliveryStatus(row.id, 'delivering')
  }
  row.delivery_status = 'delivering'
  ElMessage.success('已开始配送')
  updateStats()
}

async function completeDelivery(row) {
  if (window.electronAPI) {
    await window.electronAPI.updateDeliveryStatus(row.id, 'delivered')
  }
  row.delivery_status = 'delivered'
  row.actual_time = new Date().toISOString().slice(0, 19).replace('T', ' ')
  ElMessage.success('配送已完成')
  updateStats()
}

async function sendReminder(row) {
  if (window.electronAPI) {
    await window.electronAPI.sendCollectionNotice(row.id)
  }
  ElMessage.success('催收通知已发送')
}

onMounted(() => {
  loadDeliveries()
  loadPersonnel()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.status-overview {
  margin-bottom: 16px;
}

.status-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.status-card:hover {
  transform: translateY(-2px);
}

.status-card.pending {
  border-left: 4px solid #e6a23c;
}

.status-card.pending :deep(svg) {
  color: #e6a23c;
}

.status-card.delivering {
  border-left: 4px solid #409eff;
}

.status-card.delivering :deep(svg) {
  color: #409eff;
}

.status-card.delivered {
  border-left: 4px solid #67c23a;
}

.status-card.delivered :deep(svg) {
  color: #67c23a;
}

.status-card.overdue {
  border-left: 4px solid #f56c6c;
}

.status-card.overdue :deep(svg) {
  color: #f56c6c;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-num {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.status-label {
  font-size: 13px;
  color: #909399;
}
</style>
