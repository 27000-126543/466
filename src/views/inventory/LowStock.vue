<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon color="#f56c6c"><Bell /></el-icon>
        库存预警
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="generatePurchaseOrder" :disabled="lowStockProducts.length === 0">
          <el-icon><ShoppingCart /></el-icon>
          一键生成补货单
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div class="warning-summary">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="warning-card danger">
            <div class="warning-icon">
              <el-icon :size="28"><Warning /></el-icon>
            </div>
            <div class="warning-text">
              <div class="warning-count">{{ lowStockProducts.length }}</div>
              <div class="warning-label">库存预警商品</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="warning-card warning">
            <div class="warning-icon">
              <el-icon :size="28"><TrendCharts /></el-icon>
            </div>
            <div class="warning-text">
              <div class="warning-count">{{ totalStockValue.toFixed(0) }}</div>
              <div class="warning-label">库存总价值(元)</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="warning-card info">
            <div class="warning-icon">
              <el-icon :size="28"><Goods /></el-icon>
            </div>
            <div class="warning-text">
              <div class="warning-count">{{ totalProductCount }}</div>
              <div class="warning-label">商品种类</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="warning-card success">
            <div class="warning-icon">
              <el-icon :size="28"><CircleCheck /></el-icon>
            </div>
            <div class="warning-text">
              <div class="warning-count">{{ safeRate.toFixed(1) }}%</div>
              <div class="warning-label">库存健康度</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="table-container">
      <h3 class="table-title">预警商品列表</h3>
      <el-table :data="lowStockProducts" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="商品名称" min-width="140" />
        <el-table-column prop="category" label="分类" width="80" />
        <el-table-column label="当前库存" width="120">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 600;">
              {{ row.stock }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="safe_stock" label="安全库存" width="100">
          <template #default="{ row }">{{ row.safe_stock }} {{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="缺口" width="100">
          <template #default="{ row }">
            <span style="color: #f56c6c;">
              {{ row.safe_stock - row.stock }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="售价" width="100">
          <template #default="{ row }">¥{{ row.price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" width="140" />
        <el-table-column label="库存状态" width="100">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(100, Math.round(row.stock / row.safe_stock * 100))"
              :stroke-width="8"
              :color="getProgressColor(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="stockIn(row)">
              入库
            </el-button>
            <el-button type="warning" link size="small" @click="createSinglePurchase(row)">
              补货
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="purchaseDialogVisible" title="生成补货订单" width="750px">
      <div class="purchase-header">
        <span>共 <b>{{ purchaseItems.length }}</b> 种商品需要补货</span>
        <el-button type="primary" size="small" @click="addPurchaseItem">
          <el-icon><Plus /></el-icon>添加商品
        </el-button>
      </div>
      <el-table :data="purchaseItems" border size="small">
        <el-table-column label="商品名称" min-width="160">
          <template #default="{ row }">
            <el-select v-model="row.product_id" placeholder="选择商品" size="small" style="width: 100%;" @change="onProductChange(row)">
              <el-option
                v-for="p in allProducts"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="补货数量" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.quantity" :min="1" size="small" style="width: 100%;" @change="calcSubtotal(row)" />
          </template>
        </el-table-column>
        <el-table-column label="单价(元)" width="130">
          <template #default="{ row }">
            <el-input-number v-model="row.unit_cost" :min="0" :precision="2" size="small" style="width: 100%;" @change="calcSubtotal(row)" />
          </template>
        </el-table-column>
        <el-table-column label="小计(元)" width="120">
          <template #default="{ row }">
            ¥{{ (row.subtotal || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60">
          <template #default="{ $index }">
            <el-button type="danger" link size="small" @click="removePurchaseItem($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="purchase-total">
        总计：<span class="total-amount">¥{{ totalPurchaseAmount.toFixed(2) }}</span>
      </div>
      <el-form label-width="100px" style="margin-top: 16px;">
        <el-form-item label="供应商">
          <el-select v-model="selectedSupplier" placeholder="请选择供应商" style="width: 300px;">
            <el-option
              v-for="s in suppliers"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="purchaseRemark" type="textarea" :rows="2" placeholder="订单备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="purchaseDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPurchaseOrder">提交补货单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Bell, ShoppingCart, Refresh, Warning, TrendCharts, Goods, CircleCheck, Plus
} from '@element-plus/icons-vue'

const router = useRouter()

const lowStockProducts = ref([])
const loading = ref(false)
const suppliers = ref([])
const allProducts = ref([])

const purchaseDialogVisible = ref(false)
const purchaseItems = ref([])
const selectedSupplier = ref(null)
const purchaseRemark = ref('')

const totalStockValue = computed(() => {
  return lowStockProducts.value.reduce((sum, p) => sum + p.stock * (p.cost || 0), 0)
})

const totalProductCount = ref(15)
const safeRate = computed(() => {
  const total = totalProductCount.value || 1
  return ((total - lowStockProducts.value.length) / total * 100)
})

const totalPurchaseAmount = computed(() => {
  return purchaseItems.value.reduce((sum, item) => sum + (item.subtotal || 0), 0)
})

async function loadData() {
  loading.value = true
  try {
    if (window.electronAPI) {
      lowStockProducts.value = await window.electronAPI.getLowStockProducts()
    }
    if (!lowStockProducts.value || lowStockProducts.value.length === 0) {
      lowStockProducts.value = [
        { id: 1, name: '有机白菜', category: '蔬菜', unit: '斤', stock: 30, safe_stock: 50, price: 3.5, cost: 1.8, supplier_name: '绿源蔬菜基地' },
        { id: 2, name: '西红柿', category: '蔬菜', unit: '斤', stock: 25, safe_stock: 40, price: 5.8, cost: 3.2, supplier_name: '绿源蔬菜基地' },
        { id: 3, name: '红富士苹果', category: '水果', unit: '斤', stock: 45, safe_stock: 60, price: 8.9, cost: 5.0, supplier_name: '新鲜水果直供' },
        { id: 5, name: '鸡蛋', category: '蛋类', unit: '盒', stock: 40, safe_stock: 60, price: 15.8, cost: 9.0, supplier_name: '肉类联合加工厂' },
        { id: 7, name: '虾', category: '水产', unit: '斤', stock: 12, safe_stock: 25, price: 45.8, cost: 28.0, supplier_name: '水产养殖合作社' }
      ]
    }
  } finally {
    loading.value = false
  }
}

async function loadAllProducts() {
  if (window.electronAPI) {
    try {
      allProducts.value = await window.electronAPI.getProducts()
    } catch (e) {
      console.error('加载商品列表失败:', e)
    }
  }
  if (!allProducts.value || allProducts.value.length === 0) {
    allProducts.value = [
      { id: 1, name: '有机白菜', category: '蔬菜', unit: '斤', stock: 30, safe_stock: 50, price: 3.5, cost: 1.8 },
      { id: 2, name: '西红柿', category: '蔬菜', unit: '斤', stock: 25, safe_stock: 40, price: 5.8, cost: 3.2 },
      { id: 3, name: '红富士苹果', category: '水果', unit: '斤', stock: 45, safe_stock: 60, price: 8.9, cost: 5.0 },
      { id: 4, name: '黄瓜', category: '蔬菜', unit: '斤', stock: 35, safe_stock: 40, price: 4.5, cost: 2.4 },
      { id: 5, name: '鸡蛋', category: '蛋类', unit: '盒', stock: 40, safe_stock: 60, price: 15.8, cost: 9.0 },
      { id: 6, name: '香蕉', category: '水果', unit: '斤', stock: 55, safe_stock: 60, price: 6.8, cost: 3.5 },
      { id: 7, name: '虾', category: '水产', unit: '斤', stock: 12, safe_stock: 25, price: 45.8, cost: 28.0 }
    ]
  }
}

function getProgressColor(row) {
  const rate = row.stock / row.safe_stock
  if (rate < 0.3) return '#f56c6c'
  if (rate < 0.6) return '#e6a23c'
  return '#67c23a'
}

function stockIn(row) {
  ElMessage.info('请前往库存管理进行入库操作')
}

function calcSubtotal(row) {
  row.subtotal = Number(((row.unit_cost || 0) * (row.quantity || 0)).toFixed(2))
}

function onProductChange(row) {
  const product = allProducts.value.find(p => p.id === row.product_id)
  if (product) {
    row.product_name = product.name
    if (!row.unit_cost || row.unit_cost === 0) {
      row.unit_cost = product.cost || 0
    }
    calcSubtotal(row)
  }
}

function createSinglePurchase(row) {
  const qty = Math.max(1, row.safe_stock - row.stock + 20)
  const unitCost = row.cost || 0
  purchaseItems.value = [{
    product_id: row.id,
    product_name: row.name,
    quantity: qty,
    unit_cost: unitCost,
    subtotal: Number((qty * unitCost).toFixed(2))
  }]
  purchaseDialogVisible.value = true
}

function generatePurchaseOrder() {
  purchaseItems.value = lowStockProducts.value.map(p => {
    const qty = Math.max(1, p.safe_stock - p.stock + 20)
    const unitCost = p.cost || 0
    return {
      product_id: p.id,
      product_name: p.name,
      quantity: qty,
      unit_cost: unitCost,
      subtotal: Number((qty * unitCost).toFixed(2))
    }
  })
  purchaseDialogVisible.value = true
}

function addPurchaseItem() {
  purchaseItems.value.push({
    product_id: null,
    product_name: '',
    quantity: 10,
    unit_cost: 0,
    subtotal: 0
  })
}

function removePurchaseItem(index) {
  purchaseItems.value.splice(index, 1)
}

async function submitPurchaseOrder() {
  if (!selectedSupplier.value) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (purchaseItems.value.length === 0) {
    ElMessage.warning('请添加商品明细')
    return
  }
  const invalidItems = purchaseItems.value.filter(item => !item.product_id || item.quantity <= 0)
  if (invalidItems.length > 0) {
    ElMessage.warning('请完善所有商品明细：选择商品且数量大于0')
    return
  }

  try {
    const orderPayload = {
      supplier_id: selectedSupplier.value,
      items: purchaseItems.value.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal
      })),
      remark: purchaseRemark.value
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.createPurchaseOrder(orderPayload)
      if (result && result.success) {
        ElMessage.success('补货订单已生成')
        purchaseDialogVisible.value = false
        selectedSupplier.value = null
        purchaseRemark.value = ''
        purchaseItems.value = []
        router.push('/inventory/purchase')
      } else {
        ElMessage.error(result?.message || '补货单生成失败')
      }
    } else {
      ElMessage.success('补货订单已生成（Mock模式）')
      purchaseDialogVisible.value = false
      selectedSupplier.value = null
      purchaseRemark.value = ''
      purchaseItems.value = []
    }
  } catch (e) {
    console.error('提交补货单失败:', e)
    ElMessage.error('提交失败：' + (e.message || '未知错误'))
  }
}

function loadSuppliers() {
  suppliers.value = [
    { id: 1, name: '绿源蔬菜基地' },
    { id: 2, name: '新鲜水果直供' },
    { id: 3, name: '肉类联合加工厂' },
    { id: 4, name: '水产养殖合作社' }
  ]
}

onMounted(() => {
  loadData()
  loadAllProducts()
  loadSuppliers()
})
</script>

<style scoped>
.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.warning-summary {
  margin-bottom: 16px;
}

.warning-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.warning-card.danger .warning-icon {
  background: linear-gradient(135deg, #f56c6c, #f5558);
}

.warning-card.warning .warning-icon {
  background: linear-gradient(135deg, #e6a23c, #f56c6c);
}

.warning-card.info .warning-icon {
  background: linear-gradient(135deg, #409eff, #667eea);
}

.warning-card.success .warning-icon {
  background: linear-gradient(135deg, #67c23a, #43e97b);
}

.warning-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.warning-text {
  flex: 1;
}

.warning-count {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.warning-label {
  font-size: 13px;
  color: #909399;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.purchase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #606266;
}

.purchase-header b {
  color: #409eff;
  font-size: 16px;
}

.purchase-total {
  margin-top: 16px;
  text-align: right;
  font-size: 14px;
}

.total-amount {
  color: #f56c6c;
  font-size: 20px;
  font-weight: 600;
  margin-left: 8px;
}
</style>
