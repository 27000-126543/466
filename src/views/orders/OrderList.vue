<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建订单
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="订单状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待审核" value="pending" />
            <el-option label="已审核" value="qualified" />
            <el-option label="待分拣" value="sorting" />
            <el-option label="配送中" value="delivering" />
            <el-option label="已送达" value="delivered" />
            <el-option label="已完成" value="completed" />
            <el-option label="不合格" value="unqualified" />
          </el-select>
        </el-form-item>
        <el-form-item label="小区">
          <el-select v-model="filterForm.communityId" placeholder="全部小区" clearable style="width: 160px">
            <el-option
              v-for="c in communities"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            placeholder="订单号/客户名/手机号"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">
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
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="140" />
        <el-table-column prop="customer_name" label="客户姓名" width="100" />
        <el-table-column prop="customer_phone" label="联系电话" width="130" />
        <el-table-column prop="community_name" label="所属小区" width="140" />
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
        <el-table-column prop="deadline" label="截止时间" width="150" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row.id)">
              详情
            </el-button>
            <el-button type="success" link size="small" @click="validateOrder(row)" v-if="row.order_status === 'pending'">
              审核
            </el-button>
            <el-button type="warning" link size="small" @click="startSorting(row)" v-if="row.order_status === 'qualified'">
              分拣
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </div>

    <el-dialog v-model="showCreateDialog" title="新建订单" width="700px">
      <el-form :model="newOrder" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属团长">
              <el-select v-model="newOrder.leader_id" placeholder="请选择团长" style="width: 100%">
                <el-option
                  v-for="l in leaders"
                  :key="l.id"
                  :label="l.name"
                  :value="l.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属小区">
              <el-select v-model="newOrder.community_id" placeholder="请选择小区" style="width: 100%">
                <el-option
                  v-for="c in communities"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
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
          <el-input v-model="newOrder.delivery_address" placeholder="请输入收货地址" />
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker
            v-model="newOrder.deadline"
            type="datetime"
            placeholder="选择截止时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="商品明细">
          <div class="order-items">
            <el-table :data="newOrder.items" size="small" border>
              <el-table-column label="商品名称" min-width="160">
                <template #default="{ row }">
                  <el-select v-model="row.product_id" placeholder="选择商品" size="small" style="width: 100%;" @change="onProductChange(row)">
                    <el-option
                      v-for="p in products"
                      :key="p.id"
                      :label="p.name"
                      :value="p.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.quantity" :min="1" size="small" style="width: 100%;" @change="calcSubtotal(row)" />
                </template>
              </el-table-column>
              <el-table-column label="单价(元)" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.unit_price" :min="0" :precision="2" size="small" style="width: 100%;" @change="calcSubtotal(row)" />
                </template>
              </el-table-column>
              <el-table-column label="小计(元)" width="110">
                <template #default="{ row }">¥{{ row.subtotal?.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="60">
                <template #default="{ $index }">
                  <el-button type="danger" link size="small" @click="removeItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" plain size="small" style="margin-top: 8px;" @click="addItem">
              <el-icon><Plus /></el-icon>添加商品
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="newOrder.remark" type="textarea" :rows="2" placeholder="订单备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitOrder">提交订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

const router = useRouter()

const orders = ref([])
const loading = ref(false)
const communities = ref([])
const leaders = ref([])
const products = ref([])

const filterForm = reactive({
  status: '',
  communityId: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const showCreateDialog = ref(false)
const newOrder = reactive({
  leader_id: null,
  community_id: null,
  customer_name: '',
  customer_phone: '',
  delivery_address: '',
  deadline: '',
  remark: '',
  items: []
})

async function loadOrders() {
  loading.value = true
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.getOrders({
        status: filterForm.status || undefined,
        communityId: filterForm.communityId || undefined,
        keyword: filterForm.keyword || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      orders.value = result.list
      pagination.total = result.total
    } else {
      orders.value = generateMockOrders()
      pagination.total = 100
    }
  } finally {
    loading.value = false
  }
}

function generateMockOrders() {
  const statuses = ['pending', 'qualified', 'sorting', 'delivering', 'delivered', 'completed']
  const communities = ['阳光花园', '幸福里小区', '绿城家园', '金茂府', '万科城市花园']
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十']

  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    order_no: 'DD' + (240001 + i),
    customer_name: names[i % names.length],
    customer_phone: '138' + String(10000000 + i).padStart(8, '0'),
    community_name: communities[i % 5],
    delivery_address: `${communities[i % 5]} ${i + 1}号楼 ${101 + i}室`,
    total_amount: Math.floor(Math.random() * 200 + 30),
    payment_status: Math.random() > 0.2 ? 'paid' : 'unpaid',
    order_status: statuses[i % statuses.length],
    deadline: '2024-06-18 18:00:00',
    address_verified: Math.random() > 0.1 ? 1 : 0
  }))
}

async function loadCommunities() {
  if (window.electronAPI) {
    communities.value = await window.electronAPI.getCommunities()
  } else {
    communities.value = [
      { id: 1, name: '阳光花园' },
      { id: 2, name: '幸福里小区' },
      { id: 3, name: '绿城家园' },
      { id: 4, name: '金茂府' },
      { id: 5, name: '万科城市花园' }
    ]
  }
}

async function loadLeaders() {
  if (window.electronAPI) {
    leaders.value = await window.electronAPI.getLeaders()
  } else {
    leaders.value = [
      { id: 1, name: '张团长' },
      { id: 2, name: '李团长' }
    ]
  }
}

async function loadProducts() {
  if (window.electronAPI) {
    products.value = await window.electronAPI.getProducts()
  }
}

function resetFilter() {
  filterForm.status = ''
  filterForm.communityId = ''
  filterForm.keyword = ''
  pagination.page = 1
  loadOrders()
}

function viewDetail(id) {
  router.push(`/orders/${id}`)
}

async function validateOrder(row) {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.validateOrder(row.id)
      if (result.qualified) {
        ElMessage.success('订单审核通过')
      } else {
        ElMessageBox.alert(
          `订单存在以下问题：\n${result.issues?.join('\n')}`,
          '订单不合格',
          { type: 'warning' }
        )
      }
    } else {
      ElMessage.success('订单审核通过')
    }
    loadOrders()
  } catch (e) {
    ElMessage.error('审核失败')
  }
}

async function startSorting(row) {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.deductStock(row.id)
      if (result.success) {
        ElMessage.success('已开始分拣，库存已扣减')
        loadOrders()
      } else {
        if (result.insufficientItems && result.insufficientItems.length > 0) {
          const itemNames = result.insufficientItems.map(
            item => `${item.product_name}（需${item.required}，库存${item.available}）`
          ).join('；')
          ElMessage.error('库存不足，无法分拣：' + itemNames)
        } else {
          ElMessage.error(result.message || '分拣失败，请重试')
        }
      }
    } else {
      ElMessage.success('已开始分拣，库存已扣减')
      loadOrders()
    }
  } catch (e) {
    ElMessage.error('操作失败：' + e.message)
  }
}

function getStatusText(status) {
  const map = {
    pending: '待审核',
    qualified: '已审核',
    sorting: '待分拣',
    delivering: '配送中',
    delivered: '已送达',
    completed: '已完成',
    unqualified: '不合格'
  }
  return map[status] || status
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

function addItem() {
  newOrder.items.push({
    product_id: null,
    product_name: '',
    quantity: 1,
    unit_price: 0,
    subtotal: 0
  })
}

function removeItem(index) {
  newOrder.items.splice(index, 1)
}

function onProductChange(row) {
  const product = products.value.find(p => p.id === row.product_id)
  if (product) {
    row.product_name = product.name
    if (!row.unit_price || row.unit_price === 0) {
      row.unit_price = product.price || 0
    }
    calcSubtotal(row)
  }
}

function calcSubtotal(row) {
  row.subtotal = Number(((row.unit_price || 0) * (row.quantity || 0)).toFixed(2))
}

async function submitOrder() {
  try {
    if (!newOrder.leader_id) {
      ElMessage.warning('请选择团长')
      return
    }
    if (!newOrder.community_id) {
      ElMessage.warning('请选择小区')
      return
    }
    if (!newOrder.customer_name) {
      ElMessage.warning('请输入客户姓名')
      return
    }
    if (!newOrder.customer_phone) {
      ElMessage.warning('请输入联系电话')
      return
    }
    if (!newOrder.delivery_address) {
      ElMessage.warning('请输入收货地址')
      return
    }
    if (newOrder.items.length === 0) {
      ElMessage.warning('请添加商品明细')
      return
    }
    const invalidItems = newOrder.items.filter(item => !item.product_id || item.quantity <= 0)
    if (invalidItems.length > 0) {
      ElMessage.warning('请完善所有商品明细：选择商品且数量大于0')
      return
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.createOrder(newOrder)
      if (result.success) {
        ElMessage.success('订单创建成功')
        showCreateDialog.value = false
        resetNewOrder()
        loadOrders()
      }
    } else {
      ElMessage.success('订单创建成功')
      showCreateDialog.value = false
      resetNewOrder()
    }
  } catch (e) {
    console.error('创建订单失败:', e)
    ElMessage.error('创建失败：' + (e.message || '未知错误'))
  }
}

function resetNewOrder() {
  newOrder.leader_id = null
  newOrder.community_id = null
  newOrder.customer_name = ''
  newOrder.customer_phone = ''
  newOrder.delivery_address = ''
  newOrder.deadline = ''
  newOrder.remark = ''
  newOrder.items = []
}

onMounted(() => {
  loadOrders()
  loadCommunities()
  loadLeaders()
  loadProducts()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.order-items {
  width: 100%;
}
</style>
