<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">数据概览</h2>
      <div class="header-right">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          size="default"
          @change="loadData"
        />
      </div>
    </div>

    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-header">
            <div>
              <div class="stat-card-title">今日订单</div>
              <div class="stat-card-value">{{ dailyStats?.total_orders || 0 }}</div>
            </div>
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
              <el-icon><Document /></el-icon>
            </div>
          </div>
          <div class="stat-trend">
            <el-tag size="small" type="success" effect="plain">
              <el-icon><Top /></el-icon>
              较昨日 +12.5%
            </el-tag>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-header">
            <div>
              <div class="stat-card-title">今日营业额</div>
              <div class="stat-card-value">¥{{ dailyStats?.total_amount?.toFixed(2) || '0.00' }}</div>
            </div>
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c);">
              <el-icon><Money /></el-icon>
            </div>
          </div>
          <div class="stat-trend">
            <el-tag size="small" type="success" effect="plain">
              <el-icon><Top /></el-icon>
              较昨日 +8.3%
            </el-tag>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-header">
            <div>
              <div class="stat-card-title">履约率</div>
              <div class="stat-card-value">{{ dailyStats?.fulfillment_rate?.toFixed(1) || 0 }}%</div>
            </div>
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
              <el-icon><CircleCheck /></el-icon>
            </div>
          </div>
          <div class="stat-trend">
            <el-tag size="small" type="info" effect="plain">目标 95%</el-tag>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-header">
            <div>
              <div class="stat-card-title">损耗率</div>
              <div class="stat-card-value">{{ dailyStats?.loss_rate?.toFixed(2) || 0 }}%</div>
            </div>
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
              <el-icon><Warning /></el-icon>
            </div>
          </div>
          <div class="stat-trend">
            <el-tag size="small" type="info" effect="plain">警戒线 3%</el-tag>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="16">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">订单趋势</h3>
            <el-radio-group v-model="chartType" size="small" @change="renderChart">
              <el-radio-button value="week">近7天</el-radio-button>
              <el-radio-button value="month">近30天</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="chartRef" class="chart-content"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">小区订单分布</h3>
          </div>
          <div ref="pieChartRef" class="chart-content"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="info-row">
      <el-col :span="12">
        <div class="info-card">
          <div class="info-header">
            <h3 class="info-title">
              <el-icon color="#f56c6c"><Bell /></el-icon>
              库存预警
            </h3>
            <el-button type="primary" link @click="goToLowStock">查看全部</el-button>
          </div>
          <div class="warning-list">
            <div v-if="lowStockProducts.length === 0" class="empty-warning">
              <el-empty description="暂无预警商品" :image-size="80" />
            </div>
            <div v-else class="warning-item" v-for="item in lowStockProducts.slice(0, 5)" :key="item.id">
              <div class="warning-info">
                <span class="warning-name">{{ item.name }}</span>
                <span class="warning-category">{{ item.category }}</span>
              </div>
              <div class="warning-stock">
                <span class="stock-current">库存: {{ item.stock }}{{ item.unit }}</span>
                <span class="stock-safe">安全库存: {{ item.safe_stock }}{{ item.unit }}</span>
              </div>
              <el-tag size="small" type="danger">不足</el-tag>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-card">
          <div class="info-header">
            <h3 class="info-title">
              <el-icon color="#e6a23c"><Van /></el-icon>
              配送状态
            </h3>
            <el-button type="primary" link @click="goToDelivery">查看全部</el-button>
          </div>
          <div class="delivery-status">
            <div class="status-item">
              <div class="status-number status-pending">{{ deliveryStats.pending }}</div>
              <div class="status-label">待配送</div>
            </div>
            <div class="status-item">
              <div class="status-number status-delivering">{{ deliveryStats.delivering }}</div>
              <div class="status-label">配送中</div>
            </div>
            <div class="status-item">
              <div class="status-number status-delivered">{{ deliveryStats.delivered }}</div>
              <div class="status-label">已送达</div>
            </div>
            <div class="status-item">
              <div class="status-number status-overdue">{{ deliveryStats.overdue }}</div>
              <div class="status-label">已超时</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import {
  Document, Money, CircleCheck, Warning, Bell, Van, Top
} from '@element-plus/icons-vue'

const router = useRouter()

const selectedDate = ref(new Date())
const dailyStats = ref(null)
const lowStockProducts = ref([])
const deliveryStats = ref({
  pending: 0,
  delivering: 0,
  delivered: 0,
  overdue: 0
})
const chartType = ref('week')
const chartRef = ref(null)
const pieChartRef = ref(null)
let chartInstance = null
let pieChartInstance = null

async function loadData() {
  if (window.electronAPI) {
    const dateStr = selectedDate.value.toISOString?.().slice(0, 10) || 
                    new Date(selectedDate.value).toISOString().slice(0, 10)
    
    dailyStats.value = await window.electronAPI.getDailyStats(dateStr)
    lowStockProducts.value = await window.electronAPI.getLowStockProducts()
    
    const deliveries = await window.electronAPI.getDeliveries()
    deliveryStats.value = {
      pending: deliveries.filter(d => d.delivery_status === 'pending').length,
      delivering: deliveries.filter(d => d.delivery_status === 'delivering').length,
      delivered: deliveries.filter(d => d.delivery_status === 'delivered').length,
      overdue: deliveries.filter(d => d.is_overdue).length
    }
  } else {
    dailyStats.value = {
      total_orders: 128,
      total_amount: 5680.50,
      fulfillment_rate: 92.5,
      loss_rate: 2.3
    }
    lowStockProducts.value = [
      { id: 1, name: '有机白菜', category: '蔬菜', stock: 30, safe_stock: 50, unit: '斤' },
      { id: 2, name: '西红柿', category: '蔬菜', stock: 25, safe_stock: 40, unit: '斤' },
      { id: 3, name: '红富士苹果', category: '水果', stock: 45, safe_stock: 60, unit: '斤' }
    ]
    deliveryStats.value = {
      pending: 15,
      delivering: 8,
      delivered: 45,
      overdue: 2
    }
  }
}

function renderChart() {
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const days = chartType.value === 'week' ? 7 : 30
  const xData = []
  const orderData = []
  const amountData = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    xData.push((date.getMonth() + 1) + '/' + date.getDate())
    orderData.push(Math.floor(Math.random() * 50 + 80))
    amountData.push(Math.floor(Math.random() * 3000 + 2000))
  }

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['订单数', '营业额'],
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLine: { lineStyle: { color: '#eee' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: [
      {
        type: 'value',
        name: '订单数',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLabel: { color: '#909399' }
      },
      {
        type: 'value',
        name: '营业额(元)',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#909399' }
      }
    ],
    series: [
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        data: orderData,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
            { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
          ])
        },
        lineStyle: { color: '#667eea', width: 2 },
        itemStyle: { color: '#667eea' }
      },
      {
        name: '营业额',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: amountData,
        lineStyle: { color: '#f5576c', width: 2 },
        itemStyle: { color: '#f5576c' }
      }
    ]
  })
}

function renderPieChart() {
  if (!pieChartRef.value) return

  if (!pieChartInstance) {
    pieChartInstance = echarts.init(pieChartRef.value)
  }

  const data = [
    { value: 35, name: '阳光花园' },
    { value: 28, name: '幸福里小区' },
    { value: 22, name: '绿城家园' },
    { value: 25, name: '金茂府' },
    { value: 18, name: '万科城市花园' }
  ]

  pieChartInstance.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}单 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#606266' }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: false }
        },
        labelLine: { show: false },
        data: data,
        color: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b']
      }
    ]
  })
}

function goToLowStock() {
  router.push('/low-stock')
}

function goToDelivery() {
  router.push('/delivery')
}

onMounted(async () => {
  await loadData()
  await nextTick()
  renderChart()
  renderPieChart()
})

const handleResize = () => {
  chartInstance?.resize()
  pieChartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  pieChartInstance?.dispose()
})
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.stat-card-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-card-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.stat-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
}

.stat-trend {
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
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
  height: 280px;
  width: 100%;
}

.info-row {
  margin-bottom: 16px;
}

.info-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-warning {
  padding: 20px 0;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fef0f0;
  border-radius: 8px;
}

.warning-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.warning-category {
  font-size: 12px;
  color: #909399;
}

.warning-stock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.stock-current {
  font-size: 13px;
  color: #f56c6c;
  font-weight: 500;
}

.stock-safe {
  font-size: 12px;
  color: #909399;
}

.delivery-status {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
}

.status-item {
  text-align: center;
}

.status-number {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 6px;
}

.status-pending {
  color: #e6a23c;
}

.status-delivering {
  color: #409eff;
}

.status-delivered {
  color: #67c23a;
}

.status-overdue {
  color: #f56c6c;
}

.status-label {
  font-size: 13px;
  color: #909399;
}
</style>
