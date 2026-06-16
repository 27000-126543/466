<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">分润明细</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          size="default"
          @change="loadProfit"
        />
      </div>
    </div>

    <div class="profit-summary">
      <el-row :gutter="16">
        <el-col :span="8">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
              <el-icon :size="24"><Money /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-label">本月总收益</div>
              <div class="summary-value">¥{{ profitData.totalProfit?.toFixed(2) || '0.00' }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
              <el-icon :size="24"><Document /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-label">订单数量</div>
              <div class="summary-value">{{ profitData.orderCount || 0 }}单</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
              <el-icon :size="24"><TrendCharts /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-label">预估下月</div>
              <div class="summary-value">¥{{ estimatedNextMonth }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">近6个月收益趋势</h3>
      <div ref="chartRef" class="chart-content"></div>
    </div>

    <div class="table-container">
      <h3 class="table-title">分润明细</h3>
      <el-table :data="profitRecords" v-loading="loading" stripe>
        <el-table-column prop="created_at" label="日期" width="160">
          <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
        <el-table-column prop="order_no" label="关联订单" width="140" />
        <el-table-column prop="profit_type" label="收益类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="success">{{ getProfitType(row.profit_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">¥{{ row.order_amount?.toFixed(2) || '0.00' }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="分润金额" width="120">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: 500;">+¥{{ row.amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="month" label="结算月份" width="120" />
        <el-table-column label="状态" width="100">
          <template #default>
            <el-tag size="small" type="success">已到账</el-tag>
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
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import * as echarts from 'echarts'
import { Money, Document, TrendCharts } from '@element-plus/icons-vue'

const userStore = useUserStore()

const selectedMonth = ref(new Date())
const profitData = ref({
  totalProfit: 0,
  orderCount: 0,
  records: []
})
const profitRecords = ref([])
const loading = ref(false)

const chartRef = ref(null)
let chartInstance = null

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const estimatedNextMonth = computed(() => {
  return (profitData.value.totalProfit * 1.1).toFixed(2)
})

async function loadProfit() {
  loading.value = true
  try {
    if (window.electronAPI) {
      const leaderId = userStore.user?.id || 1
      const monthStr = selectedMonth.value.toISOString?.().slice(0, 7) || 
                       new Date(selectedMonth.value).toISOString().slice(0, 7)
      const data = await window.electronAPI.getLeaderProfit(leaderId, monthStr)
      profitData.value = data
      profitRecords.value = data.records || []
      pagination.total = data.records?.length || 0
    } else {
      profitData.value = {
        totalProfit: 1258.60,
        orderCount: 86,
        records: generateMockRecords()
      }
      profitRecords.value = profitData.value.records
      pagination.total = 50
    }
  } finally {
    loading.value = false
  }
}

function generateMockRecords() {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    order_no: 'DD' + (240001 + i),
    amount: (Math.random() * 20 + 5).toFixed(2),
    profit_type: 'order',
    order_amount: (Math.random() * 200 + 50).toFixed(2),
    month: '2024-06',
    created_at: '2024-06-1' + (i % 6) + ' 14:' + (30 + i) + ':00'
  }))
}

function getProfitType(type) {
  const map = { order: '订单分润', bonus: '奖励', subsidy: '补贴' }
  return map[type] || type
}

function renderChart() {
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const months = []
  const data = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push((d.getMonth() + 1) + '月')
    data.push(Math.floor(Math.random() * 800 + 400))
  }

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>收益：¥{c}'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: '#eee' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#909399', formatter: '¥{value}' }
    },
    series: [
      {
        type: 'bar',
        data: data,
        barWidth: '40%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        }
      }
    ]
  })
}

onMounted(async () => {
  await loadProfit()
  await nextTick()
  renderChart()
})

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.profit-summary {
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.summary-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.summary-info {
  flex: 1;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.chart-content {
  height: 250px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
