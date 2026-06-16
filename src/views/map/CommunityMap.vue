<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">小区地图</h2>
      <div class="header-actions">
        <el-radio-group v-model="mapMode" size="default" @change="renderMap">
          <el-radio-button value="heatmap">热力图</el-radio-button>
          <el-radio-button value="stations">站点状态</el-radio-button>
          <el-radio-button value="density">订单密度</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div class="map-container">
      <div ref="mapRef" class="map-wrapper"></div>

      <div class="map-legend">
        <h4>{{ mapMode === 'heatmap' ? '订单热力' : mapMode === 'stations' ? '站点状态' : '订单密度' }}</h4>
        <div v-if="mapMode === 'stations'" class="legend-items">
          <div class="legend-item">
            <span class="legend-dot busy"></span>
            <span>繁忙</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot normal"></span>
            <span>正常</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot idle"></span>
            <span>空闲</span>
          </div>
        </div>
        <div v-else class="legend-gradient">
          <div class="gradient-bar"></div>
          <div class="gradient-labels">
            <span>低</span>
            <span>高</span>
          </div>
        </div>
      </div>

      <div class="station-panel">
        <h4>站点列表</h4>
        <div class="station-list">
          <div
            v-for="station in stations"
            :key="station.id"
            class="station-item"
            :class="{ active: selectedStation === station.id }"
            @click="selectStation(station)"
          >
            <div class="station-header">
              <span class="station-name">{{ station.name }}</span>
              <el-tag :type="getStationTagType(station.status)" size="small">
                {{ getStationStatusText(station.status) }}
              </el-tag>
            </div>
            <div class="station-info">
              <span>待配送: {{ station.pendingCount }}单</span>
              <span>配送中: {{ station.deliveringCount }}单</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedStation" class="station-detail">
        <div class="detail-header">
          <h4>{{ selectedStationData?.name }}</h4>
          <el-button type="primary" link size="small" @click="selectedStation = null">
            关闭
          </el-button>
        </div>
        <div class="detail-content">
          <p><b>地址：</b>{{ selectedStationData?.address }}</p>
          <p><b>待配送订单：</b>{{ selectedStationData?.pendingCount }} 单</p>
          <p><b>配送中订单：</b>{{ selectedStationData?.deliveringCount }} 单</p>
          <p><b>站点状态：</b>{{ getStationStatusText(selectedStationData?.status) }}</p>
        </div>
        <div class="detail-actions">
          <el-button type="primary" size="small" @click="viewOrders">
            查看订单
          </el-button>
          <el-button type="success" size="small" @click="dispatchOrders">
            调度配送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const mapRef = ref(null)
const mapMode = ref('stations')
const stations = ref([])
const heatData = ref([])
const selectedStation = ref(null)
let chartInstance = null

const selectedStationData = computed(() => {
  return stations.value.find(s => s.id === selectedStation.value)
})

async function loadData() {
  if (window.electronAPI) {
    stations.value = await window.electronAPI.getStationStatus()
    heatData.value = await window.electronAPI.getMapHeatData()
  } else {
    stations.value = [
      { id: 1, name: '阳光花园', address: '朝阳区阳光路88号', lng: 116.489, lat: 39.928, pendingCount: 15, deliveringCount: 8, status: 'busy' },
      { id: 2, name: '幸福里小区', address: '海淀区幸福街66号', lng: 116.325, lat: 39.967, pendingCount: 8, deliveringCount: 4, status: 'normal' },
      { id: 3, name: '绿城家园', address: '丰台区绿城市政路12号', lng: 116.286, lat: 39.856, pendingCount: 3, deliveringCount: 1, status: 'idle' },
      { id: 4, name: '金茂府', address: '朝阳区金茂路18号', lng: 116.478, lat: 39.915, pendingCount: 18, deliveringCount: 10, status: 'busy' },
      { id: 5, name: '万科城市花园', address: '昌平区万科路8号', lng: 116.234, lat: 40.123, pendingCount: 6, deliveringCount: 3, status: 'normal' }
    ]
    heatData.value = stations.value.map(s => ({
      name: s.name,
      value: [s.lng, s.lat, s.pendingCount + s.deliveringCount]
    }))
  }
}

function renderMap() {
  if (!mapRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(mapRef.value)
  }

  if (mapMode.value === 'stations') {
    renderStationsMap()
  } else if (mapMode.value === 'heatmap') {
    renderHeatmap()
  } else {
    renderDensityMap()
  }
}

function getLngRange() {
  if (!stations.value.length) return [116.2, 116.5]
  const lngs = stations.value.map(s => s.lng)
  const min = Math.min(...lngs)
  const max = Math.max(...lngs)
  const padding = (max - min) * 0.2 || 0.1
  return [min - padding, max + padding]
}

function getLatRange() {
  if (!stations.value.length) return [39.8, 40.1]
  const lats = stations.value.map(s => s.lat)
  const min = Math.min(...lats)
  const max = Math.max(...lats)
  const padding = (max - min) * 0.2 || 0.1
  return [min - padding, max + padding]
}

function getCommonOption() {
  const lngRange = getLngRange()
  const latRange = getLatRange()
  return {
    backgroundColor: {
      type: 'radial',
      x: 0.5,
      y: 0.5,
      r: 0.8,
      colorStops: [
        { offset: 0, color: '#f0f9ff' },
        { offset: 1, color: '#e0f2fe' }
      ]
    },
    tooltip: {
      trigger: 'item'
    },
    grid: {
      left: 60,
      right: 60,
      top: 40,
      bottom: 60
    },
    xAxis: {
      type: 'value',
      name: '经度',
      min: lngRange[0],
      max: lngRange[1],
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#dcdfe6'
        }
      },
      axisLabel: {
        formatter: '{value}°'
      }
    },
    yAxis: {
      type: 'value',
      name: '纬度',
      min: latRange[0],
      max: latRange[1],
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#dcdfe6'
        }
      },
      axisLabel: {
        formatter: '{value}°'
      }
    }
  }
}

function renderStationsMap() {
  const data = stations.value.map(s => ({
    name: s.name,
    value: [s.lng, s.lat, s.pendingCount],
    status: s.status,
    pendingCount: s.pendingCount,
    deliveringCount: s.deliveringCount,
    id: s.id
  }))

  const option = {
    ...getCommonOption(),
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return `<b>${params.name}</b><br/>
                待配送: ${params.data.pendingCount}单<br/>
                配送中: ${params.data.deliveringCount}单<br/>
                状态: ${getStationStatusText(params.data.status)}`
      }
    },
    series: [
      {
        type: 'scatter',
        symbolSize: function(val) {
          return Math.max(18, val[2] * 1.8)
        },
        data: data.map(d => ({
          ...d,
          itemStyle: {
            color: d.status === 'busy' ? '#f56c6c' : d.status === 'normal' ? '#409eff' : '#67c23a',
            borderColor: '#fff',
            borderWidth: 2
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{b}',
          fontSize: 12,
          color: '#303133',
          fontWeight: 500
        },
        emphasis: {
          label: { show: true, fontWeight: 'bold' },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        }
      },
      {
        type: 'effectScatter',
        symbolSize: 10,
        rippleEffect: { brushType: 'stroke', scale: 3 },
        data: data.filter(d => d.status === 'busy').map(d => ({
          ...d,
          itemStyle: { color: '#f56c6c' }
        }))
      }
    ]
  }

  chartInstance.setOption(option, true)
  chartInstance.off('click')
  chartInstance.on('click', function(params) {
    if (params.data && params.data.id) {
      const station = stations.value.find(s => s.id === params.data.id)
      if (station) selectStation(station)
    }
  })
}

function renderHeatmap() {
  const data = stations.value.map(s => [s.lng, s.lat, s.pendingCount + s.deliveringCount, s.name, s.id])
  const maxVal = Math.max(...data.map(d => d[2]), 10)

  const option = {
    ...getCommonOption(),
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return `<b>${params.data[3]}</b><br/>订单总量: ${params.data[2]}单`
      }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      left: 20,
      bottom: 20,
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: ['#67c23a', '#a6e22e', '#e6a23c', '#f56c6c', '#c00']
      },
      dimension: 2
    },
    series: [
      {
        name: '订单热力',
        type: 'effectScatter',
        symbolSize: function(val) {
          return Math.max(25, val[2] * 3)
        },
        data: data.map(d => ({
          value: d,
          name: d[3],
          id: d[4]
        })),
        label: {
          show: true,
          formatter: function(params) {
            return params.data.name + '\n' + params.data.value[2] + '单'
          },
          fontSize: 11,
          color: '#fff',
          fontWeight: 'bold',
          lineHeight: 16
        }
      }
    ]
  }

  chartInstance.setOption(option, true)
  chartInstance.off('click')
  chartInstance.on('click', function(params) {
    if (params.data && params.data.id) {
      const station = stations.value.find(s => s.id === params.data.id)
      if (station) selectStation(station)
    }
  })
}

function renderDensityMap() {
  const data = stations.value.map(s => ({
    name: s.name,
    value: [s.lng, s.lat, s.pendingCount],
    id: s.id
  }))
  const maxVal = Math.max(...data.map(d => d.value[2]), 10)

  const option = {
    ...getCommonOption(),
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return `<b>${params.name}</b><br/>订单密度: ${params.data.value[2]} 单/平方公里`
      }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      left: 20,
      bottom: 20,
      calculable: true,
      inRange: {
        color: ['#67c23a', '#909399', '#e6a23c', '#f56c6c']
      },
      dimension: 2
    },
    series: [
      {
        name: '订单密度',
        type: 'scatter',
        symbol: 'circle',
        symbolSize: function(val) {
          return Math.max(30, val[2] * 4)
        },
        data: data,
        label: {
          show: true,
          formatter: function(params) {
            return params.name + '\n' + params.data.value[2]
          },
          fontSize: 12,
          color: '#fff',
          fontWeight: 'bold',
          lineHeight: 16
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          opacity: 0.85
        }
      }
    ]
  }

  chartInstance.setOption(option, true)
  chartInstance.off('click')
  chartInstance.on('click', function(params) {
    if (params.data && params.data.id) {
      const station = stations.value.find(s => s.id === params.data.id)
      if (station) selectStation(station)
    }
  })
}

function selectStation(station) {
  selectedStation.value = station.id
}

function getStationTagType(status) {
  const map = { busy: 'danger', normal: '', idle: 'success' }
  return map[status] || 'info'
}

function getStationStatusText(status) {
  const map = { busy: '繁忙', normal: '正常', idle: '空闲' }
  return map[status] || status
}

function viewOrders() {
  ElMessage.info('跳转到订单列表')
}

function dispatchOrders() {
  ElMessage.info('跳转到智能调度')
}

async function refreshData() {
  await loadData()
  renderMap()
  ElMessage.success('数据已刷新')
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(async () => {
  await loadData()
  await nextTick()
  renderMap()
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
  align-items: center;
}

.map-container {
  position: relative;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  height: calc(100vh - 160px);
  min-height: 500px;
}

.map-wrapper {
  width: 100%;
  height: 100%;
}

.map-legend {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 120px;
}

.map-legend h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.busy {
  background: #f56c6c;
}

.legend-dot.normal {
  background: #409eff;
}

.legend-dot.idle {
  background: #67c23a;
}

.legend-gradient {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gradient-bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right, #67c23a, #e6a23c, #f56c6c);
}

.gradient-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.station-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  width: 240px;
  max-height: calc(100% - 40px);
  overflow-y: auto;
}

.station-panel h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.station-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.station-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.station-item:hover {
  background: #ecf5ff;
}

.station-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.station-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.station-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.station-detail {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  width: 280px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.detail-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.detail-content {
  margin-bottom: 16px;
}

.detail-content p {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
}

.detail-content b {
  color: #303133;
}

.detail-actions {
  display: flex;
  gap: 10px;
}
</style>
