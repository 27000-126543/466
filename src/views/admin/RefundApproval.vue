<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">退款审批</h2>
      <el-tag type="danger" size="large">
        待审批：{{ pendingCount }} 条
      </el-tag>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="审批状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待审批" value="pending_approval" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="团长">
          <el-select v-model="filterForm.leaderId" placeholder="全部团长" clearable style="width: 140px">
            <el-option
              v-for="l in leaders"
              :key="l.id"
              :label="l.name"
              :value="l.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadApprovals">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="filteredApprovals" v-loading="loading" stripe>
        <el-table-column prop="after_sale_no" label="售后单号" width="140" />
        <el-table-column prop="order_no" label="关联订单" width="140" />
        <el-table-column prop="leader_name" label="申请团长" width="100" />
        <el-table-column prop="customer_name" label="客户" width="100" />
        <el-table-column label="售后类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getAfterSaleType(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="申请金额" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 500; font-size: 16px;">
              ¥{{ row.amount?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="申请原因" min-width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending_approval'"
              type="success"
              link
              size="small"
              @click="approve(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'pending_approval'"
              type="danger"
              link
              size="small"
              @click="reject(row)"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="售后详情" width="600px">
      <div v-if="currentItem">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px;">
          <el-descriptions-item label="售后单号">{{ currentItem.after_sale_no }}</el-descriptions-item>
          <el-descriptions-item label="关联订单">{{ currentItem.order_no }}</el-descriptions-item>
          <el-descriptions-item label="申请团长">{{ currentItem.leader_name }}</el-descriptions-item>
          <el-descriptions-item label="客户姓名">{{ currentItem.customer_name }}</el-descriptions-item>
          <el-descriptions-item label="售后类型">{{ getAfterSaleType(currentItem.type) }}</el-descriptions-item>
          <el-descriptions-item label="申请金额">
            <span style="color: #f56c6c; font-weight: 600;">¥{{ currentItem.amount?.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentItem.status)" size="small">
              {{ getStatusText(currentItem.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ currentItem.created_at }}</el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{ currentItem.reason }}</el-descriptions-item>
          <el-descriptions-item v-if="currentItem.approval_comment" label="审批意见" :span="2">
            {{ currentItem.approval_comment }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentItem.status === 'pending_approval'" class="approval-actions">
          <el-input
            v-model="approvalComment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见（选填）"
          />
          <div class="approval-btns">
            <el-button @click="detailVisible = false">取消</el-button>
            <el-button type="success" @click="confirmApprove">同意退款</el-button>
            <el-button type="danger" @click="confirmReject">拒绝申请</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const refundApprovals = ref([])
const loading = ref(false)
const leaders = ref([])

const filterForm = reactive({
  status: 'pending_approval',
  leaderId: ''
})

const detailVisible = ref(false)
const currentItem = ref(null)
const approvalComment = ref('')

const pendingCount = computed(() => {
  return refundApprovals.value.filter(a => a.status === 'pending_approval').length
})

const filteredApprovals = computed(() => {
  let list = refundApprovals.value
  if (filterForm.status) {
    list = list.filter(a => a.status === filterForm.status)
  }
  if (filterForm.leaderId) {
    list = list.filter(a => a.leader_id === filterForm.leaderId)
  }
  return list
})

async function loadApprovals() {
  loading.value = true
  try {
    if (window.electronAPI) {
      refundApprovals.value = await window.electronAPI.getRefundApprovals()
    } else {
      refundApprovals.value = generateMockData()
    }
  } finally {
    loading.value = false
  }
}

function generateMockData() {
  const types = ['return', 'exchange', 'refund']
  const statuses = ['pending_approval', 'pending_approval', 'pending_approval', 'approved', 'rejected']
  const reasons = ['商品严重不新鲜', '包装破损严重', '数量短缺较多', '质量问题', '发错商品']
  const leaders = ['张团长', '李团长', '王团长']

  return Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    after_sale_no: 'AS' + (240001 + i),
    order_id: i + 1,
    order_no: 'DD' + (240001 + i),
    leader_id: (i % 2) + 1,
    leader_name: leaders[i % 2],
    customer_name: '客户' + (i + 1),
    type: types[i % types.length],
    amount: (60 + Math.random() * 100).toFixed(2),
    status: statuses[i % statuses.length],
    needs_approval: 1,
    reason: reasons[i % reasons.length],
    approval_comment: i === 4 ? '金额过大，需要核实' : '',
    created_at: '2024-06-1' + (i % 6) + ' 16:00:00'
  }))
}

function getAfterSaleType(type) {
  const map = { return: '退货', exchange: '换货', refund: '退款' }
  return map[type] || type
}

function getStatusType(status) {
  const map = {
    pending_approval: 'warning',
    approved: 'success',
    rejected: 'danger',
    pending: 'info',
    processing: 'primary',
    completed: 'success'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    pending_approval: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    pending: '待处理',
    processing: '处理中',
    completed: '已完成'
  }
  return map[status] || status
}

function viewDetail(row) {
  currentItem.value = row
  approvalComment.value = ''
  detailVisible.value = true
}

function approve(row) {
  currentItem.value = row
  approvalComment.value = ''
  detailVisible.value = true
}

function reject(row) {
  currentItem.value = row
  approvalComment.value = ''
  detailVisible.value = true
}

async function confirmApprove() {
  if (window.electronAPI) {
    await window.electronAPI.approveRefund(currentItem.value.id, true, approvalComment.value)
  }
  currentItem.value.status = 'approved'
  currentItem.value.approval_comment = approvalComment.value
  ElMessage.success('审批通过')
  detailVisible.value = false
  loadApprovals()
}

async function confirmReject() {
  if (!approvalComment.value) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  if (window.electronAPI) {
    await window.electronAPI.approveRefund(currentItem.value.id, false, approvalComment.value)
  }
  currentItem.value.status = 'rejected'
  currentItem.value.approval_comment = approvalComment.value
  ElMessage.success('已拒绝')
  detailVisible.value = false
  loadApprovals()
}

function loadLeaders() {
  leaders.value = [
    { id: 1, name: '张团长' },
    { id: 2, name: '李团长' }
  ]
}

onMounted(() => {
  loadApprovals()
  loadLeaders()
})
</script>

<style scoped>
.approval-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.approval-btns {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
