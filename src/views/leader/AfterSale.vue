<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">售后管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showApplyDialog = true" v-if="userStore.userRole === 'leader'">
          <el-icon><Plus /></el-icon>
          申请售后
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="售后状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="待审批" value="pending_approval" />
            <el-option label="已完成" value="completed" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="售后类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="退货" value="return" />
            <el-option label="换货" value="exchange" />
            <el-option label="退款" value="refund" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAfterSales">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="afterSales" v-loading="loading" stripe>
        <el-table-column prop="after_sale_no" label="售后单号" width="140" />
        <el-table-column prop="order_no" label="关联订单" width="140" />
        <el-table-column prop="customer_name" label="客户" width="100" v-if="userStore.userRole === 'admin'" />
        <el-table-column prop="leader_name" label="团长" width="100" v-if="userStore.userRole === 'admin'" />
        <el-table-column label="售后类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getAfterSaleType(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="申请金额" width="110">
          <template #default="{ row }">
            <span style="color: #f56c6c;">¥{{ row.amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="申请原因" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="userStore.userRole === 'admin'" prop="needs_approval" label="是否超额" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.needs_approval" type="danger" size="small">是</el-tag>
            <el-tag v-else type="success" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="userStore.userRole === 'admin' && row.status === 'pending'"
              type="success"
              link
              size="small"
              @click="processAfterSale(row)"
            >
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showApplyDialog" title="申请售后" width="500px">
      <el-form :model="applyForm" label-width="100px">
        <el-form-item label="关联订单">
          <el-select v-model="applyForm.order_id" placeholder="请选择订单" style="width: 100%;">
            <el-option
              v-for="o in myOrders"
              :key="o.id"
              :label="o.order_no + ' - ¥' + o.total_amount"
              :value="o.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="售后类型">
          <el-radio-group v-model="applyForm.type">
            <el-radio value="return">退货</el-radio>
            <el-radio value="exchange">换货</el-radio>
            <el-radio value="refund">退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="申请金额">
          <el-input-number v-model="applyForm.amount" :min="0" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="申请原因">
          <el-input v-model="applyForm.reason" type="textarea" :rows="3" placeholder="请详细描述问题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="售后详情" width="600px">
      <div v-if="currentAfterSale">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px;">
          <el-descriptions-item label="售后单号">{{ currentAfterSale.after_sale_no }}</el-descriptions-item>
          <el-descriptions-item label="关联订单">{{ currentAfterSale.order_no }}</el-descriptions-item>
          <el-descriptions-item label="售后类型">{{ getAfterSaleType(currentAfterSale.type) }}</el-descriptions-item>
          <el-descriptions-item label="申请金额">¥{{ currentAfterSale.amount?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentAfterSale.status)" size="small">
              {{ getStatusText(currentAfterSale.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ currentAfterSale.created_at }}</el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{ currentAfterSale.reason }}</el-descriptions-item>
          <el-descriptions-item v-if="currentAfterSale.approval_comment" label="审批意见" :span="2">
            {{ currentAfterSale.approval_comment }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

const userStore = useUserStore()

const afterSales = ref([])
const loading = ref(false)
const myOrders = ref([])

const filterForm = reactive({
  status: '',
  type: ''
})

const showApplyDialog = ref(false)
const applyForm = reactive({
  order_id: null,
  type: 'refund',
  amount: 0,
  reason: ''
})

const detailVisible = ref(false)
const currentAfterSale = ref(null)

async function loadAfterSales() {
  loading.value = true
  try {
    if (window.electronAPI) {
      const leaderId = userStore.userRole === 'leader' ? userStore.user.id : null
      afterSales.value = await window.electronAPI.getAfterSales(leaderId)
    } else {
      afterSales.value = generateMockData()
    }
  } finally {
    loading.value = false
  }
}

function generateMockData() {
  const types = ['return', 'exchange', 'refund']
  const statuses = ['pending', 'processing', 'completed', 'pending_approval', 'rejected']
  const reasons = ['商品不新鲜', '包装破损', '数量不足', '质量问题', '发错货']

  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    after_sale_no: 'AS' + (240001 + i),
    order_id: i + 1,
    order_no: 'DD' + (240001 + i),
    customer_name: '客户' + (i + 1),
    leader_name: '张团长',
    type: types[i % types.length],
    amount: (Math.random() * 100 + 20).toFixed(2),
    status: statuses[i % statuses.length],
    needs_approval: i === 3 || i === 7 ? 1 : 0,
    reason: reasons[i % reasons.length],
    approval_comment: i === 7 ? '金额过大，请核实' : '',
    created_at: '2024-06-1' + (i % 6) + ' 15:30:00'
  }))
}

function getAfterSaleType(type) {
  const map = { return: '退货', exchange: '换货', refund: '退款' }
  return map[type] || type
}

function getStatusType(status) {
  const map = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    pending_approval: '',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    pending_approval: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return map[status] || status
}

function viewDetail(row) {
  currentAfterSale.value = row
  detailVisible.value = true
}

function processAfterSale(row) {
  row.status = 'processing'
  ElMessage.success('已开始处理')
}

async function submitApply() {
  if (!applyForm.order_id) {
    ElMessage.warning('请选择订单')
    return
  }
  if (!applyForm.reason) {
    ElMessage.warning('请填写申请原因')
    return
  }

  if (window.electronAPI) {
    const result = await window.electronAPI.createAfterSale({
      ...applyForm,
      leader_id: userStore.user.id
    })
    if (result.success) {
      ElMessage.success(applyForm.amount > 50 ? '申请已提交，等待主管审批' : '申请已提交')
      showApplyDialog.value = false
      loadAfterSales()
    }
  } else {
    ElMessage.success('申请已提交')
    showApplyDialog.value = false
    loadAfterSales()
  }
}

function loadMyOrders() {
  myOrders.value = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    order_no: 'DD' + (240001 + i),
    total_amount: (Math.random() * 150 + 30).toFixed(2)
  }))
}

onMounted(() => {
  loadAfterSales()
  loadMyOrders()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}
</style>
