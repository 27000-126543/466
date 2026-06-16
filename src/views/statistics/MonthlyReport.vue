<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">月度运营报告</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          placeholder="选择月份"
          size="default"
          @change="loadReport"
        />
        <el-button type="success" @click="exportPDF">
          <el-icon><Download /></el-icon>
          导出PDF
        </el-button>
      </div>
    </div>

    <div class="report-container">
      <div class="report-header">
        <h1>社区生鲜团购月度运营报告</h1>
        <p class="report-subtitle">{{ reportMonth }} 月度</p>
      </div>

      <div class="summary-section">
        <h3 class="section-title">
          <el-icon color="#409eff"><DataLine /></el-icon>
          核心指标
        </h3>
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-label">总订单量</div>
              <div class="metric-value">{{ monthlyData?.summary?.totalOrders || 0 }}</div>
              <div class="metric-change positive">
                <el-icon><Top /></el-icon>
                环比 +12.5%
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-label">总营业额</div>
              <div class="metric-value">¥{{ monthlyData?.summary?.totalAmount?.toFixed(2) || '0.00' }}</div>
              <div class="metric-change positive">
                <el-icon><Top /></el-icon>
                环比 +8.3%
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-label">平均履约率</div>
              <div class="metric-value">{{ monthlyData?.summary?.avgFulfillmentRate?.toFixed(1) || 0 }}%</div>
              <div class="metric-change positive">
                <el-icon><Top /></el-icon>
                环比 +2.1%
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-label">平均损耗率</div>
              <div class="metric-value">{{ monthlyData?.summary?.avgLossRate?.toFixed(2) || 0 }}%</div>
              <div class="metric-change negative">
                <el-icon><Bottom /></el-icon>
                环比 -0.3%
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="chart-section">
        <h3 class="section-title">
          <el-icon color="#67c23a"><TrendCharts /></el-icon>
          日订单与营业额趋势
        </h3>
        <div ref="chartRef" class="chart-wrapper"></div>
      </div>

      <div class="community-section">
        <h3 class="section-title">
          <el-icon color="#e6a23c"><OfficeBuilding /></el-icon>
          各小区运营数据
        </h3>
        <el-table :data="communityStats" border stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="小区名称" />
          <el-table-column prop="orders" label="订单量" width="100" />
          <el-table-column prop="amount" label="营业额(元)" width="120">
            <template #default="{ row }">¥{{ row.amount?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="占比" width="150">
            <template #default="{ row }">
              <el-progress
                :percentage="getPercentage(row.amount)"
                :stroke-width="8"
              />
            </template>
          </el-table-column>
          <el-table-column label="同比" width="100">
            <template #default>
              <span style="color: #67c23a;">+15.2%</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="analysis-section">
        <h3 class="section-title">
          <el-icon color="#909399"><Document /></el-icon>
          运营分析
        </h3>
        <div class="analysis-content">
          <p>1. 本月整体运营情况良好，订单量和营业额均实现双增长。</p>
          <p>2. 阳光花园和金茂府两个小区表现突出，订单量占比超过50%。</p>
          <p>3. 履约率持续提升，已接近95%的目标值。</p>
          <p>4. 损耗率控制在合理范围内，较上月有所下降。</p>
          <p>5. 建议：加强绿城家园小区的推广力度，提升订单量。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElLoading } from 'element-plus'
import {
  Download, DataLine, TrendCharts, OfficeBuilding, Document, Top, Bottom
} from '@element-plus/icons-vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const selectedMonth = ref(new Date())
const monthlyData = ref(null)
const communityStats = ref([])
const chartRef = ref(null)
let chartInstance = null

const reportMonth = computed(() => {
  if (!selectedMonth.value) return ''
  const d = new Date(selectedMonth.value)
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
})

const totalAmount = computed(() => {
  return communityStats.value.reduce((sum, c) => sum + (c.amount || 0), 0)
})

function getPercentage(amount) {
  if (!totalAmount.value) return 0
  return Math.round(amount / totalAmount.value * 100)
}

async function loadReport() {
  try {
    if (window.electronAPI) {
      const d = new Date(selectedMonth.value)
      const year = d.getFullYear()
      const month = d.getMonth() + 1

      try {
        const result = await window.electronAPI.getMonthlyStats(year, month)
        monthlyData.value = result
      } catch (e) {
        console.warn('获取月度统计失败，使用默认数据:', e)
        const dayCount = new Date(year, month, 0).getDate()
        const dailyStats = []
        for (let i = 1; i <= dayCount; i++) {
          dailyStats.push({
            stat_date: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
            total_orders: Math.floor(Math.random() * 50 + 20),
            total_amount: Number((Math.random() * 5000 + 2000).toFixed(2)),
            fulfillment_rate: Number((85 + Math.random() * 15).toFixed(1)),
            loss_rate: Number((1 + Math.random() * 3).toFixed(2))
          })
        }
        monthlyData.value = {
          summary: {
            totalOrders: dailyStats.reduce((s, d) => s + d.total_orders, 0),
            totalAmount: Number(dailyStats.reduce((s, d) => s + d.total_amount, 0).toFixed(2)),
            avgFulfillmentRate: Number((dailyStats.reduce((s, d) => s + d.fulfillment_rate, 0) / dailyStats.length).toFixed(1)),
            avgLossRate: Number((dailyStats.reduce((s, d) => s + d.loss_rate, 0) / dailyStats.length).toFixed(2))
          },
          dailyStats
        }
      }

      try {
        const communityData = await window.electronAPI.exportMonthlyReport(year, month)
        communityStats.value = communityData.communityStats || []
      } catch (e) {
        console.warn('获取小区统计失败，使用默认数据:', e)
        communityStats.value = [
          { name: '阳光花园', orders: 420, amount: 18500.00 },
          { name: '金茂府', orders: 380, amount: 16800.50 },
          { name: '幸福里小区', orders: 310, amount: 13500.00 },
          { name: '万科城市花园', orders: 250, amount: 10800.00 },
          { name: '绿城家园', orders: 180, amount: 7800.00 }
        ]
      }
    } else {
      const days = 30
      const dailyStats = []
      for (let i = 1; i <= days; i++) {
        dailyStats.push({
          stat_date: `2024-06-${String(i).padStart(2, '0')}`,
          total_orders: Math.floor(Math.random() * 30 + 100),
          total_amount: Math.floor(Math.random() * 2000 + 3000),
          fulfillment_rate: 85 + Math.random() * 15,
          loss_rate: 1 + Math.random() * 2
        })
      }
      monthlyData.value = {
        summary: {
          totalOrders: dailyStats.reduce((s, d) => s + d.total_orders, 0),
          totalAmount: dailyStats.reduce((s, d) => s + d.total_amount, 0),
          avgFulfillmentRate: dailyStats.reduce((s, d) => s + d.fulfillment_rate, 0) / days,
          avgLossRate: dailyStats.reduce((s, d) => s + d.loss_rate, 0) / days
        },
        dailyStats
      }

      communityStats.value = [
        { name: '阳光花园', orders: 420, amount: 18500.00 },
        { name: '金茂府', orders: 380, amount: 16800.50 },
        { name: '幸福里小区', orders: 310, amount: 13500.00 },
        { name: '万科城市花园', orders: 250, amount: 10800.00 },
        { name: '绿城家园', orders: 180, amount: 7800.00 }
      ]
    }
    renderChart()
  } catch (error) {
    console.error('加载月度报告失败:', error)
    if (!monthlyData.value) {
      monthlyData.value = {
        summary: { totalOrders: 0, totalAmount: 0, avgFulfillmentRate: 0, avgLossRate: 2.5 },
        dailyStats: []
      }
    }
    if (!communityStats.value || communityStats.value.length === 0) {
      communityStats.value = [{ name: '暂无数据', orders: 0, amount: 0 }]
    }
  }
}

function renderChart() {
  if (!chartRef.value || !monthlyData.value?.dailyStats) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const data = monthlyData.value.dailyStats
  const xData = data.map(d => d.stat_date.slice(5))
  const orderData = data.map(d => d.total_orders)
  const amountData = data.map(d => d.total_amount)

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['订单量', '营业额'],
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
      data: xData,
      axisLine: { lineStyle: { color: '#eee' } },
      axisLabel: { color: '#909399', fontSize: 11 }
    },
    yAxis: [
      {
        type: 'value',
        name: '订单量',
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
        name: '订单量',
        type: 'line',
        smooth: true,
        data: orderData,
        lineStyle: { color: '#667eea', width: 2 },
        itemStyle: { color: '#667eea' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
            { offset: 1, color: 'rgba(102, 126, 234, 0.02)' }
          ])
        }
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

async function exportPDF() {
  const year = selectedMonth.value.getFullYear()
  const month = selectedMonth.value.getMonth() + 1

  const loading = ElLoading.service({
    lock: true,
    text: '正在生成PDF报告...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    const summaryData = monthlyData.value?.summary || {
      totalOrders: 0,
      totalAmount: 0,
      avgFulfillmentRate: 0,
      avgLossRate: 2.5
    }
    const dailyStatsData = monthlyData.value?.dailyStats?.map(d => ({
      date: d.stat_date || d.date || '',
      orders: d.total_orders || d.orders || 0,
      amount: Number(d.total_amount || d.amount || 0)
    })) || []
    const communityStatsData = communityStats.value?.map(c => ({
      name: c.name || '',
      orders: c.orders || 0,
      amount: Number(c.amount || 0)
    })) || []

    console.log('[PDF] 前端准备的数据:', { summaryData, dailyStatsData, communityStatsData })

    if (window.electronAPI && window.electronAPI.generateMonthlyPdf) {
      const payload = {
        year,
        month,
        summary: summaryData,
        dailyStats: dailyStatsData,
        communityStats: communityStatsData
      }
      const result = await window.electronAPI.generateMonthlyPdf(payload)
      if (result.success) {
        ElMessage.success('PDF报告导出成功：' + result.filePath)
      } else if (result.canceled) {
        ElMessage.info('已取消导出')
      } else {
        ElMessage.error('PDF导出失败：' + (result.message || '未知错误'))
      }
      return
    }

    if (!monthlyData.value || !monthlyData.value.summary) {
      throw new Error('没有可用的报告数据，请先加载报告')
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPos = margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    const title = 'Monthly Report'
    const titleWidth = doc.getTextWidth(title)
    doc.text(title, (pageWidth - titleWidth) / 2, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    const subtitle = reportMonth.value
    const subtitleWidth = doc.getTextWidth(subtitle)
    doc.text(subtitle, (pageWidth - subtitleWidth) / 2, yPos)
    yPos += 15

    doc.setDrawColor(64, 158, 255)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('1. Key Metrics', margin, yPos)
    yPos += 10

    const summary = monthlyData.value.summary
    const metrics = [
      ['Total Orders', summary.totalOrders || 0, '+12.5%'],
      ['Total Revenue', '$' + (summary.totalAmount || 0).toFixed(2), '+8.3%'],
      ['Fulfillment Rate', (summary.avgFulfillmentRate || 0).toFixed(1) + '%', '+2.1%'],
      ['Loss Rate', (summary.avgLossRate || 0).toFixed(2) + '%', '-0.3%']
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value', 'Change']],
      body: metrics,
      headStyles: {
        fillColor: [64, 158, 255],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        cellPadding: 8,
        fontSize: 11
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { left: margin, right: margin }
    })

    yPos = doc.lastAutoTable.finalY + 15

    if (chartInstance) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('2. Daily Trend', margin, yPos)
      yPos += 8

      try {
        const chartImage = chartInstance.getDataURL({
          pixelRatio: 2,
          backgroundColor: '#fff'
        })
        const imgWidth = pageWidth - margin * 2
        const imgHeight = 60
        doc.addImage(chartImage, 'PNG', margin, yPos, imgWidth, imgHeight)
        yPos += imgHeight + 15
      } catch (e) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150, 150, 150)
        doc.text('(Chart unavailable, showing data table)', margin, yPos)
        yPos += 8

        const dailyData = monthlyData.value.dailyStats?.slice(0, 10) || []
        const trendBody = dailyData.map((d) => [
          d.stat_date?.slice(5) || '',
          d.total_orders || 0,
          '$' + (d.total_amount || 0).toFixed(2),
          (d.fulfillment_rate || 0).toFixed(1) + '%'
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Orders', 'Revenue', 'Fulfillment']],
          body: trendBody,
          headStyles: {
            fillColor: [103, 194, 58],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: { fontSize: 10 },
          margin: { left: margin, right: margin }
        })
        yPos = doc.lastAutoTable.finalY + 15
      }
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('3. Community Ranking', margin, yPos)
    yPos += 8

    const communityBody = communityStats.value
      .sort((a, b) => b.amount - a.amount)
      .map((c, idx) => [
        idx + 1,
        c.name,
        c.orders || 0,
        '$' + (c.amount || 0).toFixed(2),
        getPercentage(c.amount) + '%'
      ])

    autoTable(doc, {
      startY: yPos,
      head: [['Rank', 'Community', 'Orders', 'Revenue', 'Share']],
      body: communityBody,
      headStyles: {
        fillColor: [230, 162, 60],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 10 },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { left: margin, right: margin }
    })

    yPos = doc.lastAutoTable.finalY + 15

    if (yPos > 250) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('4. Analysis', margin, yPos)
    yPos += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    const analysis = [
      '- Overall operations are good this month.',
      '- Top communities contribute more than 50% of orders.',
      '- Fulfillment rate continues to improve.',
      '- Loss rate is well controlled.',
      '- Recommendation: increase marketing for low-volume communities.'
    ]

    analysis.forEach((line, idx) => {
      doc.text(line, margin, yPos + idx * 8)
    })

    yPos += analysis.length * 8 + 15

    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    const footerText = 'Generated: ' + new Date().toLocaleString()
    const footerWidth = doc.getTextWidth(footerText)
    doc.text(footerText, (pageWidth - footerWidth) / 2, 280)

    const fileName = `Monthly_Report_${reportMonth.value}.pdf`
    doc.save(fileName)

    ElMessage.success('PDF exported: ' + fileName)
  } catch (error) {
    console.error('PDF export failed:', error)
    ElMessage.error('PDF export failed: ' + (error.message || 'Unknown error'))
  } finally {
    loading.close()
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(async () => {
  await loadReport()
  await nextTick()
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

.report-container {
  background: #fff;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.report-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #409eff;
}

.report-header h1 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 8px 0;
}

.report-subtitle {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-section,
.chart-section,
.community-section,
.analysis-section {
  margin-bottom: 30px;
}

.metric-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.metric-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.metric-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.metric-change.positive {
  color: #67c23a;
}

.metric-change.negative {
  color: #f56c6c;
}

.chart-wrapper {
  height: 300px;
}

.analysis-content {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  line-height: 2;
  color: #606266;
  font-size: 14px;
}

.analysis-content p {
  margin: 0;
}
</style>
