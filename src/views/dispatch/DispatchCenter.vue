<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">智能调度中心</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="deadline"
          type="datetime"
          placeholder="订单截止时间"
          size="default"
        />
        <el-button type="primary" @click="generateRoutes">
          <el-icon><Operation /></el-icon>
          生成配送路线
        </el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="6">
        <div class="side-card">
          <h3 class="card-title">
            <el-icon color="#409eff"><OfficeBuilding /></el-icon>
            小区列表
          </h3>
          <div class="community-list">
            <div
              v-for="c in communities"
              :key="c.id"
              class="community-item"
              :class="{ active: selectedCommunity === c.id }"
              @click="selectCommunity(c.id)"
            >
              <div class="community-info">
                <span class="community-name">{{ c.name }}</span>
                <el-tag :type="getStationStatusType(c.station_status)" size="small">
                  {{ getStationStatusText(c.station_status) }}
                </el-tag>
              </div>
              <div class="community-stats">
                <span>待配送: {{ c.pendingCount || 0 }}单</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="18">
        <div class="main-card" v-if="!routeData">
          <el-empty description="请选择小区并生成配送路线" :image-size="120">
            <template #image>
              <el-icon :size="80" color="#dcdfe6"><MapLocation /></el-icon>
            </template>
          </el-empty>
        </div>

        <div v-else>
          <div class="summary-card">
            <el-row :gutter="16">
              <el-col :span="6">
                <div class="summary-item">
                  <div class="summary-label">小区</div>
                  <div class="summary-value">{{ currentCommunity?.name }}</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="summary-item">
                  <div class="summary-label">待配送订单</div>
                  <div class="summary-value highlight">{{ routeData.totalOrders }}单</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="summary-item">
                  <div class="summary-label">配送批次</div>
                  <div class="summary-value">{{ routeData.batchCount }}批</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="summary-item">
                  <div class="summary-label">预计耗时</div>
                  <div class="summary-value">{{ routeData.estimatedDuration }}分钟</div>
                </div>
              </el-col>
            </el-row>
          </div>

          <div class="batches-card">
            <h3 class="card-title">
              <el-icon color="#67c23a"><Tickets /></el-icon>
              配送批次
            </h3>
            <el-steps :active="activeBatch" direction="vertical" finish-status="success">
              <el-step
                v-for="(batch, index) in routeData.batches"
                :key="batch.batchNo"
                :title="'批次 ' + (index + 1)"
                :description="batch.orderCount + '个订单，预计' + formatTime(batch.estimatedTime)"
              >
                <template #icon>
                  <div class="batch-icon">
                    <el-icon v-if="index < activeBatch" :size="18" color="#67c23a"><CircleCheck /></el-icon>
                    <el-icon v-else-if="index === activeBatch" :size="18" class="is-loading"><Loading /></el-icon>
                    <div v-else class="batch-circle-pending"></div>
                  </div>
                </template>
              </el-step>
            </el-steps>
          </div>

          <div class="orders-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon color="#e6a23c"><Document /></el-icon>
                待配送订单
              </h3>
              <div class="card-actions">
                <el-button size="small" type="primary" @click="generatePickList">
                  <el-icon><List /></el-icon>
                  生成拣货清单
                </el-button>
                <el-button size="small" type="success" @click="assignDelivery">
                  <el-icon><Van /></el-icon>
                  安排配送
                </el-button>
              </div>
            </div>
            <el-table :data="currentBatchOrders" size="small" border>
              <el-table-column prop="order_no" label="订单号" width="130" />
              <el-table-column prop="customer_name" label="客户" width="80" />
              <el-table-column prop="customer_phone" label="电话" width="120" />
              <el-table-column prop="delivery_address" label="地址" min-width="150" show-overflow-tooltip />
              <el-table-column prop="total_amount" label="金额" width="90">
                <template #default="{ row }">¥{{ row.total_amount }}</template>
              </el-table-column>
              <el-table-column prop="deadline" label="截止时间" width="150" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag size="small" type="primary">待配送</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="pickListVisible" title="拣货清单" width="600px">
      <div v-if="pickList">
        <div class="pick-summary">
          <span>共 <b>{{ pickList.totalItems }}</b> 种商品</span>
          <span>总计 <b>{{ pickList.totalQuantity }}</b> 件</span>
        </div>
        <el-table :data="pickList.pickList" border stripe>
          <el-table-column prop="sequence" label="序号" width="60" />
          <el-table-column prop="productName" label="商品名称" />
          <el-table-column prop="totalQuantity" label="总数量" width="100" />
          <el-table-column label="拣货状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.picked ? 'success' : 'info'" size="small">
                {{ row.picked ? '已拣' : '待拣' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="pickListVisible = false">关闭</el-button>
        <el-button type="primary" @click="confirmPick">确认拣货完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Operation, OfficeBuilding, MapLocation, Tickets, Document, List, Van,
  CircleCheck, Loading
} from '@element-plus/icons-vue'

const communities = ref([])
const selectedCommunity = ref(null)
const deadline = ref(new Date())
const routeData = ref(null)
const activeBatch = ref(0)
const pickListVisible = ref(false)
const pickList = ref(null)

const currentCommunity = computed(() => {
  return communities.value.find(c => c.id === selectedCommunity.value)
})

const currentBatchOrders = computed(() => {
  if (!routeData.value?.batches?.[activeBatch.value]) return []
  return routeData.value.batches[activeBatch.value].orders || []
})

async function loadCommunities() {
  if (window.electronAPI) {
    communities.value = await window.electronAPI.getCommunities()
    const stats = await window.electronAPI.getCommunityStats()
    communities.value.forEach(c => {
      const s = stats.find(s => s.communityId === c.id)
      if (s) c.pendingCount = s.orderCount
    })
  } else {
    communities.value = [
      { id: 1, name: '阳光花园', station_status: 'busy', pendingCount: 12 },
      { id: 2, name: '幸福里小区', station_status: 'normal', pendingCount: 8 },
      { id: 3, name: '绿城家园', station_status: 'idle', pendingCount: 3 },
      { id: 4, name: '金茂府', station_status: 'busy', pendingCount: 15 },
      { id: 5, name: '万科城市花园', station_status: 'normal', pendingCount: 6 }
    ]
  }
}

function selectCommunity(id) {
  selectedCommunity.value = id
  routeData.value = null
}

async function generateRoutes() {
  if (!selectedCommunity.value) {
    ElMessage.warning('请先选择小区')
    return
  }

  if (window.electronAPI) {
    const deadlineStr = deadline.value?.toISOString?.().slice(0, 19).replace('T', ' ') || ''
    routeData.value = await window.electronAPI.generateDeliveryRoute(selectedCommunity.value, deadlineStr)
  } else {
    const orders = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      order_no: 'DD' + (240001 + i),
      customer_name: '客户' + (i + 1),
      customer_phone: '13800' + String(10000 + i).padStart(5, '0'),
      delivery_address: '小区' + (i % 3 + 1) + '号楼' + (i + 1) + '单元',
      total_amount: (Math.random() * 100 + 30).toFixed(2),
      deadline: '2024-06-18 18:00:00'
    }))

    routeData.value = {
      communityId: selectedCommunity.value,
      totalOrders: 15,
      batchCount: 2,
      totalDistance: 8.5,
      estimatedDuration: 45,
      batches: [
        {
          batchNo: 'PC001',
          orderCount: 10,
          orders: orders.slice(0, 10),
          estimatedTime: '2024-06-17 14:00:00'
        },
        {
          batchNo: 'PC002',
          orderCount: 5,
          orders: orders.slice(10),
          estimatedTime: '2024-06-17 15:30:00'
        }
      ]
    }
  }
}

async function generatePickList() {
  if (window.electronAPI) {
    const batch = routeData.value?.batches?.[activeBatch.value]
    if (batch) {
      pickList.value = await window.electronAPI.generatePickList(batch.batchNo)
      pickListVisible.value = true
    }
  } else {
    pickList.value = {
      batchId: 'BATCH001',
      totalItems: 8,
      totalQuantity: 35,
      pickList: [
        { sequence: 1, productName: '有机白菜', totalQuantity: 8, picked: false },
        { sequence: 2, productName: '西红柿', totalQuantity: 6, picked: false },
        { sequence: 3, productName: '红富士苹果', totalQuantity: 10, picked: false },
        { sequence: 4, productName: '鸡蛋', totalQuantity: 5, picked: false },
        { sequence: 5, productName: '黄瓜', totalQuantity: 6, picked: false }
      ]
    }
    pickListVisible.value = true
  }
}

function confirmPick() {
  ElMessage.success('拣货完成，已扣减库存')
  pickListVisible.value = false
}

function assignDelivery() {
  ElMessage.info('请前往配送管理页面安排配送员')
}

function getStationStatusType(status) {
  const map = { busy: 'danger', normal: '', idle: 'success' }
  return map[status] || 'info'
}

function getStationStatusText(status) {
  const map = { busy: '繁忙', normal: '正常', idle: '空闲' }
  return map[status] || status
}

function formatTime(time) {
  if (!time) return ''
  return time.slice(11, 16)
}

onMounted(() => {
  loadCommunities()
})
</script>

<style scoped>
.side-card,
.main-card,
.summary-card,
.batches-card,
.orders-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.community-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.community-item {
  padding: 12px;
  border-radius: 8px;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.community-item:hover {
  background: #ecf5ff;
}

.community-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.community-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.community-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.community-stats {
  font-size: 12px;
  color: #909399;
}

.summary-item {
  text-align: center;
  padding: 10px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.summary-value.highlight {
  color: #409eff;
}

.batch-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-circle-pending {
  width: 18px;
  height: 18px;
  border: 2px solid #dcdfe6;
  border-radius: 50%;
  box-sizing: border-box;
}

.pick-summary {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.pick-summary b {
  color: #409eff;
  font-size: 18px;
}
</style>
