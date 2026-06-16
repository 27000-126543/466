<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">分拣批次</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          size="default"
          @change="loadBatches"
        />
        <el-button type="primary" @click="generateBatches">
          <el-icon><Refresh /></el-icon>
          生成分拣批次
        </el-button>
      </div>
    </div>

    <div class="batches-container">
      <div v-if="batches.length === 0" class="empty-batches">
        <el-empty description="暂无分拣批次" />
      </div>

      <div v-else class="batch-grid">
        <div v-for="batch in batches" :key="batch.batchId" class="batch-card" :class="batch.status">
          <div class="batch-header">
            <div class="batch-title">
              <el-icon :size="20"><Tickets /></el-icon>
              <span>{{ batch.batchId }}</span>
            </div>
            <el-tag :type="getBatchStatusType(batch.status)" size="small">
              {{ getBatchStatusText(batch.status) }}
            </el-tag>
          </div>

          <div class="batch-info">
            <div class="info-item">
              <span class="info-label">小区</span>
              <span class="info-value">{{ batch.communityName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">订单数</span>
              <span class="info-value highlight">{{ batch.orderCount }}单</span>
            </div>
          </div>

          <div class="batch-orders">
            <div class="orders-title">订单列表</div>
            <div class="order-list">
              <div v-for="order in batch.orders.slice(0, 3)" :key="order.id" class="order-item">
                <span class="order-no">{{ order.order_no }}</span>
                <span class="order-customer">{{ order.customer_name }}</span>
                <span class="order-amount">¥{{ order.total_amount }}</span>
              </div>
              <div v-if="batch.orders.length > 3" class="more-orders">
                还有 {{ batch.orders.length - 3 }} 个订单...
              </div>
            </div>
          </div>

          <div class="batch-actions">
            <el-button size="small" type="primary" @click="viewDetail(batch)">
              查看详情
            </el-button>
            <el-button
              size="small"
              type="success"
              @click="startPicking(batch)"
              v-if="batch.status === 'pending'"
            >
              开始分拣
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="finishPicking(batch)"
              v-if="batch.status === 'sorting'"
            >
              完成分拣
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="分拣批次详情" width="800px">
      <div v-if="currentBatch">
        <el-descriptions :column="3" border size="small" style="margin-bottom: 16px;">
          <el-descriptions-item label="批次号">{{ currentBatch.batchId }}</el-descriptions-item>
          <el-descriptions-item label="所属小区">{{ currentBatch.communityName }}</el-descriptions-item>
          <el-descriptions-item label="订单数量">{{ currentBatch.orderCount }}单</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getBatchStatusType(currentBatch.status)" size="small">
              {{ getBatchStatusText(currentBatch.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分拣日期">{{ currentBatch.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="操作人">系统</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-bottom: 12px;">拣货清单</h4>
        <el-table :data="pickList" size="small" border>
          <el-table-column prop="sequence" label="序号" width="60" />
          <el-table-column prop="productName" label="商品名称" />
          <el-table-column prop="totalQuantity" label="总数量" width="100" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.picked ? 'success' : 'info'">
                {{ row.picked ? '已拣' : '待拣' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <h4 style="margin: 16px 0 12px 0;">订单列表</h4>
        <el-table :data="currentBatch.orders" size="small" border max-height="250">
          <el-table-column prop="order_no" label="订单号" width="130" />
          <el-table-column prop="customer_name" label="客户" width="80" />
          <el-table-column prop="delivery_address" label="地址" min-width="150" show-overflow-tooltip />
          <el-table-column prop="total_amount" label="金额" width="90">
            <template #default="{ row }">¥{{ row.total_amount }}</template>
          </el-table-column>
          <el-table-column prop="deadline" label="截止时间" width="140" />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" v-if="currentBatch?.status === 'pending'" @click="startPicking(currentBatch)">
          开始分拣
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Tickets, Refresh } from '@element-plus/icons-vue'

const selectedDate = ref(new Date())
const batches = ref([])
const detailVisible = ref(false)
const currentBatch = ref(null)
const pickList = ref([])

async function loadBatches() {
  if (window.electronAPI) {
    const dateStr = selectedDate.value.toISOString?.().slice(0, 10) ||
                    new Date(selectedDate.value).toISOString().slice(0, 10)
    batches.value = await window.electronAPI.getSortingBatches(dateStr)
  } else {
    batches.value = [
      {
        batchId: 'BATCH' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_01',
        communityId: 1,
        communityName: '阳光花园',
        orderCount: 8,
        status: 'sorting',
        createdAt: new Date().toISOString().slice(0, 10),
        orders: generateMockOrders(8)
      },
      {
        batchId: 'BATCH' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_02',
        communityId: 2,
        communityName: '幸福里小区',
        orderCount: 6,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
        orders: generateMockOrders(6)
      },
      {
        batchId: 'BATCH' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_03',
        communityId: 3,
        communityName: '绿城家园',
        orderCount: 4,
        status: 'completed',
        createdAt: new Date().toISOString().slice(0, 10),
        orders: generateMockOrders(4)
      },
      {
        batchId: 'BATCH' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_04',
        communityId: 4,
        communityName: '金茂府',
        orderCount: 10,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
        orders: generateMockOrders(10)
      }
    ]
  }
}

function generateMockOrders(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    order_no: 'DD' + (240000 + Math.floor(Math.random() * 10000)),
    customer_name: '客户' + (i + 1),
    delivery_address: '小区' + ((i % 3) + 1) + '号楼',
    total_amount: (Math.random() * 80 + 30).toFixed(2),
    deadline: '18:00:00'
  }))
}

async function generateBatches() {
  ElMessage.success('分拣批次已生成')
  loadBatches()
}

async function viewDetail(batch) {
  currentBatch.value = batch
  if (window.electronAPI) {
    const data = await window.electronAPI.generatePickList(batch.batchId)
    pickList.value = data.pickList
  } else {
    pickList.value = [
      { sequence: 1, productName: '有机白菜', totalQuantity: 12, unit: '斤', picked: batch.status !== 'pending' },
      { sequence: 2, productName: '西红柿', totalQuantity: 8, unit: '斤', picked: batch.status === 'completed' },
      { sequence: 3, productName: '红富士苹果', totalQuantity: 15, unit: '斤', picked: batch.status === 'completed' },
      { sequence: 4, productName: '鸡蛋', totalQuantity: 6, unit: '盒', picked: batch.status === 'completed' },
      { sequence: 5, productName: '黄瓜', totalQuantity: 10, unit: '斤', picked: batch.status === 'completed' }
    ]
  }
  detailVisible.value = true
}

function startPicking(batch) {
  batch.status = 'sorting'
  ElMessage.success('已开始分拣')
}

function finishPicking(batch) {
  batch.status = 'completed'
  ElMessage.success('分拣完成，已扣减库存')
}

function getBatchStatusType(status) {
  const map = { pending: 'warning', sorting: 'primary', completed: 'success' }
  return map[status] || 'info'
}

function getBatchStatusText(status) {
  const map = { pending: '待分拣', sorting: '分拣中', completed: '已完成' }
  return map[status] || status
}

onMounted(() => {
  loadBatches()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.empty-batches {
  padding: 60px 0;
}

.batch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.batch-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.batch-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.batch-card.sorting {
  border-top: 3px solid #409eff;
}

.batch-card.completed {
  border-top: 3px solid #67c23a;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.batch-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.batch-info {
  display: flex;
  gap: 20px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #ebeef5;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  color: #303133;
}

.info-value.highlight {
  color: #409eff;
  font-weight: 600;
  font-size: 18px;
}

.batch-orders {
  margin-bottom: 16px;
}

.orders-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}

.order-no {
  color: #409eff;
}

.order-customer {
  flex: 1;
  text-align: center;
  color: #606266;
}

.order-amount {
  color: #f56c6c;
  font-weight: 500;
}

.more-orders {
  font-size: 12px;
  color: #909399;
  text-align: center;
  padding: 6px;
}

.batch-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
