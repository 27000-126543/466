<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">补货订单</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建补货单
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="订单状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待审核" value="pending" />
            <el-option label="配送中" value="shipping" />
            <el-option label="已入库" value="received" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="filterForm.supplierId" placeholder="全部供应商" clearable style="width: 180px">
            <el-option
              v-for="s in suppliers"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
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
      <el-table :data="purchaseOrders" v-loading="loading" stripe>
        <el-table-column prop="purchase_no" label="补货单号" width="140" />
        <el-table-column prop="supplier_name" label="供应商" width="160" />
        <el-table-column label="商品明细" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="(item, idx) in row.items?.slice(0, 2)" :key="idx" size="small" style="margin-right: 4px;">
              {{ item.product_name }} x{{ item.quantity }}
            </el-tag>
            <span v-if="row.items?.length > 2" style="color: #909399; font-size: 12px;">
              等{{ row.items.length }}种
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="total_amount" label="总金额" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 500;">¥{{ row.total_amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              size="small"
              @click="confirmShipping(row)"
            >
              确认发货
            </el-button>
            <el-button
              v-if="row.status === 'shipping'"
              type="warning"
              link
              size="small"
              @click="confirmReceive(row)"
            >
              确认入库
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="补货单详情" width="700px">
      <div v-if="currentOrder">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px;">
          <el-descriptions-item label="补货单号">{{ currentOrder.purchase_no }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ currentOrder.supplier_name }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ currentOrder.total_amount?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentOrder.status)" size="small">
              {{ getStatusText(currentOrder.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentOrder.created_at }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ currentOrder.remark || '无' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-bottom: 12px;">商品明细</h4>
        <el-table :data="currentOrder.items" border size="small">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="product_name" label="商品名称" />
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="unit_cost" label="单价(元)" width="120" />
          <el-table-column prop="subtotal" label="小计(元)" width="120">
            <template #default="{ row }">¥{{ row.subtotal?.toFixed(2) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="currentOrder?.status === 'pending'"
          type="success"
          @click="confirmShipping(currentOrder)"
        >
          确认发货
        </el-button>
        <el-button
          v-if="currentOrder?.status === 'shipping'"
          type="warning"
          @click="confirmReceive(currentOrder)"
        >
          确认入库
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCreateDialog" title="新建补货单" width="700px">
      <el-form label-width="100px">
        <el-form-item label="供应商">
          <el-select v-model="newOrder.supplier_id" placeholder="请选择供应商" style="width: 300px;">
            <el-option
              v-for="s in suppliers"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品明细">
          <div class="items-container">
            <el-table :data="newOrder.items" border size="small">
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
              <el-table-column label="数量" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.quantity" :min="1" size="small" style="width: 100%;" @change="calcSubtotal(row)" />
                </template>
              </el-table-column>
              <el-table-column label="单价(元)" width="130">
                <template #default="{ row }">
                  <el-input-number v-model="row.unit_cost" :min="0" :precision="2" size="small" style="width: 100%;" @change="calcSubtotal(row)" />
                </template>
              </el-table-column>
              <el-table-column label="小计(元)" width="110">
                <template #default="{ row }">¥{{ row.subtotal?.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="60">
                <template #default="{ $index }">
                  <el-button type="danger" link size="small" @click="removeNewItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" plain size="small" style="margin-top: 8px;" @click="addNewItem">
              <el-icon><Plus /></el-icon>添加商品
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="newOrder.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitNewOrder">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

const purchaseOrders = ref([])
const loading = ref(false)
const suppliers = ref([])
const products = ref([])

const filterForm = reactive({
  status: '',
  supplierId: ''
})

const detailVisible = ref(false)
const currentOrder = ref(null)

const showCreateDialog = ref(false)
const newOrder = reactive({
  supplier_id: null,
  items: [],
  remark: ''
})

async function loadOrders() {
  loading.value = true
  try {
    if (window.electronAPI) {
      const params = {}
      if (filterForm.status) params.status = filterForm.status
      if (filterForm.supplierId) params.supplierId = filterForm.supplierId
      purchaseOrders.value = await window.electronAPI.getPurchaseOrders(params)
    }
    if (!purchaseOrders.value || purchaseOrders.value.length === 0) {
      purchaseOrders.value = [
        {
          id: 1,
          purchase_no: 'PO240001',
          supplier_id: 1,
          supplier_name: '绿源蔬菜基地',
          total_amount: 580.00,
          status: 'received',
          remark: '',
          created_at: '2024-06-15 10:00:00',
          items: [
            { product_id: 1, product_name: '有机白菜', quantity: 100, unit_cost: 1.8, subtotal: 180 },
            { product_id: 2, product_name: '西红柿', quantity: 80, unit_cost: 3.2, subtotal: 256 },
            { product_id: 3, product_name: '黄瓜', quantity: 60, unit_cost: 2.4, subtotal: 144 }
          ]
        },
        {
          id: 2,
          purchase_no: 'PO240002',
          supplier_id: 2,
          supplier_name: '新鲜水果直供',
          total_amount: 890.00,
          status: 'shipping',
          remark: '加急配送',
          created_at: '2024-06-16 09:00:00',
          items: [
            { product_id: 5, product_name: '红富士苹果', quantity: 50, unit_cost: 5.0, subtotal: 250 },
            { product_id: 6, product_name: '香蕉', quantity: 60, unit_cost: 3.5, subtotal: 210 }
          ]
        },
        {
          id: 3,
          purchase_no: 'PO240003',
          supplier_id: 3,
          supplier_name: '肉类联合加工厂',
          total_amount: 1200.00,
          status: 'pending',
          remark: '',
          created_at: '2024-06-16 11:00:00',
          items: [
            { product_id: 9, product_name: '猪五花肉', quantity: 40, unit_cost: 15.0, subtotal: 600 },
            { product_id: 10, product_name: '鸡胸肉', quantity: 50, unit_cost: 8.5, subtotal: 425 }
          ]
        }
      ]
      if (filterForm.status) {
        purchaseOrders.value = purchaseOrders.value.filter(o => o.status === filterForm.status)
      }
      if (filterForm.supplierId) {
        purchaseOrders.value = purchaseOrders.value.filter(o => o.supplier_id === filterForm.supplierId)
      }
    }
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterForm.status = ''
  filterForm.supplierId = ''
  loadOrders()
}

function getStatusType(status) {
  const map = {
    pending: 'warning',
    shipping: 'primary',
    received: 'success',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    pending: '待发货',
    shipping: '配送中',
    received: '已入库',
    cancelled: '已取消'
  }
  return map[status] || status
}

function viewDetail(row) {
  currentOrder.value = row
  detailVisible.value = true
}

async function confirmShipping(row) {
  if (window.electronAPI) {
    await window.electronAPI.updatePurchaseStatus(row.id, 'shipping')
  }
  row.status = 'shipping'
  ElMessage.success('已确认发货')
  detailVisible.value = false
  loadOrders()
}

async function confirmReceive(row) {
  if (window.electronAPI) {
    await window.electronAPI.updatePurchaseStatus(row.id, 'received')
  }
  row.status = 'received'
  ElMessage.success('已确认入库，库存已更新')
  detailVisible.value = false
  loadOrders()
}

function addNewItem() {
  newOrder.items.push({
    product_id: null,
    product_name: '',
    quantity: 10,
    unit_cost: 0,
    subtotal: 0
  })
}

function removeNewItem(index) {
  newOrder.items.splice(index, 1)
}

function onProductChange(row) {
  const product = products.value.find(p => p.id === row.product_id)
  if (product) {
    row.product_name = product.name
    if (!row.unit_cost || row.unit_cost === 0) {
      row.unit_cost = product.cost || product.price || 0
    }
    calcSubtotal(row)
  }
}

function calcSubtotal(row) {
  row.subtotal = Number(((row.unit_cost || 0) * (row.quantity || 0)).toFixed(2))
}

async function submitNewOrder() {
  if (!newOrder.supplier_id) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (newOrder.items.length === 0) {
    ElMessage.warning('请添加商品')
    return
  }
  const invalidItems = newOrder.items.filter(item => !item.product_id || item.quantity <= 0)
  if (invalidItems.length > 0) {
    ElMessage.warning('请完善所有商品明细：选择商品且数量大于0')
    return
  }

  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.createPurchaseOrder(newOrder)
      if (result && result.success) {
        ElMessage.success('补货单已创建')
        showCreateDialog.value = false
        resetNewOrder()
        loadOrders()
      }
    } else {
      ElMessage.success('补货单已创建')
      showCreateDialog.value = false
      resetNewOrder()
    }
  } catch (e) {
    console.error('创建补货单失败:', e)
    ElMessage.error('创建失败：' + (e.message || '未知错误'))
  }
}

function resetNewOrder() {
  newOrder.supplier_id = null
  newOrder.items = []
  newOrder.remark = ''
}

function loadSuppliers() {
  suppliers.value = [
    { id: 1, name: '绿源蔬菜基地' },
    { id: 2, name: '新鲜水果直供' },
    { id: 3, name: '肉类联合加工厂' },
    { id: 4, name: '水产养殖合作社' }
  ]
}

async function loadProducts() {
  if (window.electronAPI) {
    try {
      products.value = await window.electronAPI.getProducts()
    } catch (e) {
      console.error('加载商品失败:', e)
    }
  }
  if (!products.value || products.value.length === 0) {
    products.value = [
      { id: 1, name: '有机白菜', price: 3.5, cost: 1.8 },
      { id: 2, name: '西红柿', price: 5.0, cost: 3.2 },
      { id: 3, name: '黄瓜', price: 4.0, cost: 2.4 },
      { id: 5, name: '红富士苹果', price: 8.0, cost: 5.0 },
      { id: 6, name: '香蕉', price: 6.0, cost: 3.5 }
    ]
  }
}

onMounted(() => {
  loadOrders()
  loadSuppliers()
  loadProducts()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.items-container {
  width: 100%;
}
</style>
