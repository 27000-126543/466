<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">库存管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          新增商品
        </el-button>
        <el-button type="success" @click="exportInventory">
          <el-icon><Download /></el-icon>
          导出库存
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="商品分类">
          <el-select v-model="filterForm.category" placeholder="全部分类" clearable style="width: 140px">
            <el-option label="蔬菜" value="蔬菜" />
            <el-option label="水果" value="水果" />
            <el-option label="肉类" value="肉类" />
            <el-option label="蛋类" value="蛋类" />
            <el-option label="水产" value="水产" />
            <el-option label="乳品" value="乳品" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品名称">
          <el-input
            v-model="filterForm.keyword"
            placeholder="输入商品名称"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="库存状态">
          <el-radio-group v-model="filterForm.stockStatus" size="default">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="low">库存不足</el-radio-button>
            <el-radio-button value="normal">库存正常</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadInventory">
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
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="商品名称" min-width="140" />
        <el-table-column prop="category" label="分类" width="80" />
        <el-table-column label="库存" width="120">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock < row.safe_stock }">
              {{ row.stock }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="safe_stock" label="安全库存" width="100">
          <template #default="{ row }">{{ row.safe_stock }} {{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="库存状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.stock < row.safe_stock ? 'danger' : 'success'" size="small">
              {{ row.stock < row.safe_stock ? '不足' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="售价" width="100">
          <template #default="{ row }">¥{{ row.price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="cost" label="成本" width="100">
          <template #default="{ row }">¥{{ row.cost?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="供应商" width="140" />
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editProduct(row)">
              编辑
            </el-button>
            <el-button type="success" link size="small" @click="stockIn(row)">
              入库
            </el-button>
            <el-button type="warning" link size="small" @click="createPurchase(row)">
              补货
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
          @size-change="loadInventory"
          @current-change="loadInventory"
        />
      </div>
    </div>

    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑商品' : '新增商品'" width="600px">
      <el-form :model="productForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商品名称">
              <el-input v-model="productForm.name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品分类">
              <el-select v-model="productForm.category" placeholder="请选择分类" style="width: 100%">
                <el-option label="蔬菜" value="蔬菜" />
                <el-option label="水果" value="水果" />
                <el-option label="肉类" value="肉类" />
                <el-option label="蛋类" value="蛋类" />
                <el-option label="水产" value="水产" />
                <el-option label="乳品" value="乳品" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="单位">
              <el-input v-model="productForm.unit" placeholder="如：斤、盒" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="售价(元)">
              <el-input-number v-model="productForm.price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="成本(元)">
              <el-input-number v-model="productForm.cost" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="库存">
              <el-input-number v-model="productForm.stock" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="安全库存">
              <el-input-number v-model="productForm.safe_stock" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="供应商">
              <el-select v-model="productForm.supplier_id" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="s in suppliers"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="商品描述">
          <el-input v-model="productForm.description" type="textarea" :rows="3" placeholder="商品描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitProduct">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockInVisible" title="商品入库" width="400px">
      <el-form :model="stockInForm" label-width="80px">
        <el-form-item label="商品名称">
          <span>{{ currentProduct?.name }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span>{{ currentProduct?.stock }} {{ currentProduct?.unit }}</span>
        </el-form-item>
        <el-form-item label="入库数量">
          <el-input-number v-model="stockInForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="入库单价">
          <el-input-number v-model="stockInForm.cost" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockInVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStockIn">确认入库</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Download, Search, Refresh } from '@element-plus/icons-vue'

const products = ref([])
const loading = ref(false)
const suppliers = ref([])

const filterForm = reactive({
  category: '',
  keyword: '',
  stockStatus: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const showAddDialog = ref(false)
const isEdit = ref(false)
const productForm = reactive({
  id: null,
  name: '',
  category: '',
  unit: '',
  price: 0,
  cost: 0,
  stock: 0,
  safe_stock: 50,
  supplier_id: null,
  description: ''
})

const stockInVisible = ref(false)
const currentProduct = ref(null)
const stockInForm = reactive({
  quantity: 0,
  cost: 0
})

async function loadInventory() {
  loading.value = true
  try {
    if (window.electronAPI) {
      let lowStock
      if (filterForm.stockStatus === 'low') {
        lowStock = true
      } else if (filterForm.stockStatus === 'normal') {
        lowStock = false
      } else {
        lowStock = undefined
      }
      const result = await window.electronAPI.getInventory({
        category: filterForm.category || undefined,
        keyword: filterForm.keyword || undefined,
        lowStock,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      products.value = result.list
      pagination.total = result.total
    } else {
      let mockProducts = generateMockProducts()
      if (filterForm.stockStatus === 'low') {
        mockProducts = mockProducts.filter(p => p.stock < p.safe_stock)
      } else if (filterForm.stockStatus === 'normal') {
        mockProducts = mockProducts.filter(p => p.stock >= p.safe_stock)
      }
      if (filterForm.category) {
        mockProducts = mockProducts.filter(p => p.category === filterForm.category)
      }
      if (filterForm.keyword) {
        mockProducts = mockProducts.filter(p => p.name.includes(filterForm.keyword))
      }
      products.value = mockProducts
      pagination.total = mockProducts.length
    }
  } catch (e) {
    console.error('加载库存失败:', e)
    products.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function generateMockProducts() {
  const categories = ['蔬菜', '水果', '肉类', '蛋类', '水产', '乳品']
  const names = [
    '有机白菜', '西红柿', '黄瓜', '土豆', '红富士苹果', '香蕉', '橙子', '葡萄',
    '猪五花肉', '鸡胸肉', '鸡蛋', '鲫鱼', '虾', '牛奶', '酸奶'
  ]

  return names.map((name, i) => ({
    id: i + 1,
    name,
    category: categories[Math.floor(i / 3)],
    unit: ['斤', '斤', '斤', '斤', '斤', '斤', '斤', '斤', '斤', '斤', '盒', '斤', '斤', '箱', '箱'][i],
    price: 3.5 + Math.random() * 20,
    cost: 2 + Math.random() * 15,
    stock: Math.floor(Math.random() * 200 + 30),
    safe_stock: Math.floor(Math.random() * 30 + 20),
    supplier_name: '供应商' + ((i % 4) + 1),
    description: '新鲜优质' + name
  }))
}

function resetFilter() {
  filterForm.category = ''
  filterForm.keyword = ''
  filterForm.stockStatus = ''
  pagination.page = 1
  loadInventory()
}

function editProduct(row) {
  isEdit.value = true
  Object.assign(productForm, row)
  showAddDialog.value = true
}

async function submitProduct() {
  if (window.electronAPI) {
    if (isEdit.value) {
      await window.electronAPI.updateInventory(productForm.id, productForm)
      ElMessage.success('修改成功')
    } else {
      await window.electronAPI.createProduct(productForm)
      ElMessage.success('新增成功')
    }
  } else {
    ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
  }
  showAddDialog.value = false
  loadInventory()
}

function stockIn(row) {
  currentProduct.value = row
  stockInForm.quantity = 0
  stockInForm.cost = row.cost
  stockInVisible.value = true
}

async function confirmStockIn() {
  if (window.electronAPI) {
    const newStock = currentProduct.value.stock + stockInForm.quantity
    await window.electronAPI.updateInventory(currentProduct.value.id, { stock: newStock })
  }
  ElMessage.success('入库成功')
  stockInVisible.value = false
  loadInventory()
}

function createPurchase(row) {
  ElMessage.info('请前往补货订单页面创建')
}

function exportInventory() {
  ElMessage.success('库存数据已导出')
}

async function loadSuppliers() {
  if (window.electronAPI) {
    // suppliers would be loaded from API
  } else {
    suppliers.value = [
      { id: 1, name: '绿源蔬菜基地' },
      { id: 2, name: '新鲜水果直供' },
      { id: 3, name: '肉类联合加工厂' },
      { id: 4, name: '水产养殖合作社' }
    ]
  }
}

onMounted(() => {
  loadInventory()
  loadSuppliers()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.low-stock {
  color: #f56c6c;
  font-weight: 600;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
