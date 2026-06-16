<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的订单</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新增订单
        </el-button>
      </div>
    </div>

    <div class="order-stats">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-num warning">{{ stats.total }}</div>
            <div class="stat-label">全部订单</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-num primary">{{ stats.pending }}</div>
            <div class="stat-label">待处理</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-num success">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-num danger">{{ stats.unqualified }}</div>
            <div class="stat-label">不合格</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="订单状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待审核" value="pending" />
            <el-option label="已审核" value="qualified" />
            <el-option label="配送中" value="delivering" />
            <el-option label="已完成" value="completed" />
            <el-option label="不合格" value="unqualified" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="订单号/客户名" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="140" />
        <el-table-column prop="customer_name" label="客户姓名" width="100" />
        <el-table-column prop="customer_phone" label="联系电话" width="130" />
        <el-table-column prop="delivery_address" label="收货地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="total_amount" label="订单金额" width="110">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 500;">¥{{ row.total_amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="支付状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.payment_status === 'paid' ? 'success' : 'warning'" size="small">
              {{ row.payment_status === 'paid' ? '已支付' : '待支付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.order_status)" size="small">
              {{ getStatusText(row.order_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row.id)">
              详情
            </el-button>
            <el-button
              v-if="row.order_status === 'unqualified'"
              type="warning"
              link
              size="small"
              @click="editOrder(row)"
            >
              修改
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, prev, pager, next, jumper"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </div>

    <el-dialog v-model="showCreateDialog" title="新增订单" width="600px">
      <el-form :model="newOrder" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户姓名">
              <el-input v-model="newOrder.customer_name" placeholder="请输入客户姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="newOrder.customer_phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="收货地址">
          <el-input v-model="newOrder.delivery_address" placeholder="请输入完整收货地址" />
        </el-form-item>
        <el-form-item label="商品明细">
          <el-table :data="newOrder.items" size="small" border>
            <el-table-column prop="product_name" label="商品" />
            <el-table-column label="数量" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="1" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ $index }">
                <el-button type="danger" link size="small" @click="removeItem($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" plain size="small" style="margin-top: 8px;" @click="addItem">
            + 添加商品
          </el-button>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="newOrder.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitOrder">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const orders = ref([])
const loading = ref(false)

const filterForm = reactive({
  status: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const showCreateDialog = ref(false)
const newOrder = reactive({
  customer_name: '',
  customer_phone: '',
  delivery_address: '',
  items: [],
  remark: ''
})

const stats = computed(() => {
  const list = orders.value
  return {
    total: list.length,
    pending: list.filter(o => o.order_status === 'pending' || o.order_status === 'qualified').length,
    completed: list.filter(o => o.order_status === 'completed').length,
    unqualified: list.filter(o => o.order_status === 'unqualified').length
  }
})

async function loadOrders() {
  loading.value = true
  try {
    if (window.electronAPI) {
      const leaderId = userStore.user?.id || 1
      const result = await window.electronAPI.getOrders({
        leaderId,
        status: filterForm.status || undefined,
        keyword: filterForm.keyword || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      orders.value = result.list
      pagination.total = result.total
    } else {
      orders.value = generateMockOrders()
      pagination.total = 50
    }
  } finally {
    loading.value = false
  }
}

function generateMockOrders() {
  const statuses = ['pending', 'qualified', 'delivering', 'completed', 'completed', 'completed', 'unqualified']
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    order_no: 'DD' + (240001 + i),
    customer_name: '客户' + (i + 1),
    customer_phone: '138' + String(10000000 + i).padStart(8, '0'),
    delivery_address: '阳光花园' + (i + 1) + '号楼',
    total_amount: (Math.random() * 150 + 30).toFixed(2),
    payment_status: Math.random() > 0.2 ? 'paid' : 'unpaid',
    order_status: statuses[i % statuses.length],
    created_at: '2024-06-1' + (i % 6) + ' 10:30:00'
  }))
}

function getStatusType(status) {
  const map = {
    pending: 'warning',
    qualified: 'primary',
    sorting: 'info',
    delivering: '',
    delivered: 'success',
    completed: 'success',
    unqualified: 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    pending: '待审核',
    qualified: '已审核',
    sorting: '分拣中',
    delivering: '配送中',
    delivered: '已送达',
    completed: '已完成',
    unqualified: '不合格'
  }
  return map[status] || status
}

function viewDetail(id) {
  router.push(`/orders/${id}`)
}

function editOrder(row) {
  ElMessage.info('请修改订单信息后重新提交审核')
}

function addItem() {
  newOrder.items.push({
    product_id: null,
    product_name: '商品',
    quantity: 1
  })
}

function removeItem(index) {
  newOrder.items.splice(index, 1)
}

function submitOrder() {
  ElMessage.success('订单提交成功，等待审核')
  showCreateDialog.value = false
  loadOrders()
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.order-stats {
  margin-bottom: 16px;
}

.stat-item {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-num {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 6px;
}

.stat-num.warning {
  color: #e6a23c;
}

.stat-num.primary {
  color: #409eff;
}

.stat-num.success {
  color: #67c23a;
}

.stat-num.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
