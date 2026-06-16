<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">数据统计</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          size="default"
          @change="loadStats"
        />
      </div>
    </div>

    <div class="stat-cards">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
              <el-icon :size="24"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总订单量</div>
              <div class="stat-value">{{ dailyStats?.total_orders || 0 }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c);">
              <el-icon :size="24"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总营业额</div>
              <div class="stat-value">¥{{ dailyStats?.total_amount?.toFixed(2) || '0.00' }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
              <el-icon :size="24"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">履约率</div>
              <div class="stat-value">{{ dailyStats?.fulfillment_rate?.toFixed(1) || 0 }}%</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
              <el-icon :size="24"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">损耗率</div>
              <div class="stat-value">{{ dailyStats?.loss_rate?.toFixed(2) || 0 }}%</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="16">
      <el-col :span="16">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">各小区订单统计</h3>
            <el-radio-group v-model="chartType" size="small" @change="renderBarChart">
              <el-radio-button value="orders">订单量</el-radio-button>
              <el-radio-button value="amount">营业额</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="barChartRef" class="chart-content"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card">
          <h3 class="chart-title">履约率与损耗率</h3>
          <div ref="gaugeChartRef" class="chart-content"></div>
        </div>
      </el-col>
    </el-row>

    <div class="table-container" style="margin-top: 16px;">
      <h3 class="table-title">各小区明细</h3>
      <el-table :data="communityStats" border stripe>
        <el-table-column type="index" label="排名" width="70">
          <template #default="{ $index }">
            <el-tag v-if="$index < 3" :type="$index === 0 ? 'danger' : $index === 1 ? 'warning' : 'info'" size="small">
              {{ $index + 1 }}
            </el-tag>
            <span v-else>{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="communityName" label="小区名称" />
        <el-table-column prop="orderCount" label="订单量" width="100">
          <template #default="{ row }">
            <span style="font-weight: 500;">{{ row.orderCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="营业额(元)" width="120">
          <template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="deliveredCount" label="已完成" width="100" />
        <el-table-column label="履约率" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="row.fulfillmentRate"
              :stroke-width="10"
              :color="row.fulfillmentRate >= 95 ? '#67c23a' : row.fulfillmentRate >= 85 ? '#e6a23c' : '#f56c6c'"
            />
          </template>
        </el-table-column>
        <el-table-column label="站点状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStationStatusType(row.stationStatus)" size="small">
              {{ getStationStatusText(row.stationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { Document, Money, CircleCheck, TrendCharts } from '@element-plus/icons-vue'

const selectedDate = ref(new Date())
const dailyStats = ref(null)
const communityStats = ref([])
const chartType = ref('orders')
const barChartRef = ref(null)
const gaugeChartRef = ref(null)
let barChartInstance = null
let gaugeChartInstance = null

async function loadStats() {
  if (window.electronAPI) {
    const dateStr = selectedDate.value.toISOString?.().slice(0, 10) ||
                    new Date(selectedDate.value).toISOString().slice(0, 10)
    dailyStats.value = await window.electronAPI.getDailyStats(dateStr)
    communityStats.value = await window.electronAPI.getCommunityStats(dateStr)
  } else {
    dailyStats.value = {
      total_orders: 128,
      total_amount: 5680.50,
      fulfillment_rate: 92.5,
      loss_rate: 2.3
    }
    communityStats.value = [
      { communityName: '阳光花园', orderCount: 35, totalAmount: 1580.00, deliveredCount: 32, fulfillmentRate: 91.4, stationStatus: 'busy' },
      { communityName: '金茂府', orderCount: 28, totalAmount: 1420.50, deliveredCount: 27, fulfillmentRate: 96.4, stationStatus: 'busy' },
      { communityName: '幸福里小区', orderCount: 25, totalAmount: 1100.00, deliveredCount: 24, fulfillmentRate: 96.0, stationStatus: 'normal' },
      { communityName: '万科城市花园', orderCount: 22, totalAmount: 960.00, deliveredCount: 20, fulfillmentRate: 90.9, stationStatus: 'normal' },
      { communityName: '绿城家园', orderCount: 18, totalAmount: 620.00, deliveredCount: 16, fulfillmentRate: 88.9, stationStatus: 'idle' }
    ]
  }
}

function getStationStatusType(status) {
  const map = { busy: 'danger', normal: '', idle: 'success' }
  return map[status] || 'info'
}

function getStationStatusText(status) {
  const map = { busy: '繁忙', normal: '正常', idle: '空闲' }
  return map[status] || status
}

function renderBarChart() {
  if (!barChartRef.value) return

  if (!barChartInstance) {
    barChartInstance = echarts.init(barChartRef.value)
  }

  const xData = communityStats.value.map(c => c.communityName)
  const yData = chartType.value === 'orders'
    ? communityStats.value.map(c => c.orderCount)
    : communityStats.value.map(c => c.totalAmount)

  barChartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
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
      data: xData,
      axisLine: { lineStyle: { color: '#eee' } },
      axisLabel: { color: '#606266', interval: 0, rotate: 20 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#909399' }
    },
    series: [
      {
        type: 'bar',
        data: yData,
        barWidth: '50%',
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

function renderGaugeChart() {
  if (!gaugeChartRef.value) return

  if (!gaugeChartInstance) {
    gaugeChartInstance = echarts.init(gaugeChartRef.value)
  }

  gaugeChartInstance.setOption({
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        center: ['50%', '60%'],
        radius: '80%',
        itemStyle: {
          color: '#67c23a'
        },
        progress: {
          show: true,
          width: 12
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, '#eee']]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: {
          offsetCenter: [0, '20%'],
          fontSize: 14,
          color: '#909399'
        },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 'bold',
          offsetCenter: [0, '-5%'],
          formatter: '{value}%',
          color: '#67c23a'
        },
        data: [
          {
            value: dailyStats.value?.fulfillment_rate || 0,
            name: '履约率'
          }
        ]
      }
    ]
  })
}

const handleResize = () => {
  barChartInstance?.resize()
  gaugeChartInstance?.resize()
}

onMounted(async () => {
  await loadStats()
  await nextTick()
  renderBarChart()
  renderGaugeChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  barChartInstance?.dispose()
  gaugeChartInstance?.dispose()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.stat-cards {
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.chart-content {
  height: 300px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}
</style>
