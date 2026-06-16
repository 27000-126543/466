<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">小区管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        新增小区
      </el-button>
    </div>

    <div class="table-container">
      <el-table :data="communities" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="70" />
        <el-table-column prop="name" label="小区名称" min-width="140" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="坐标" width="180">
          <template #default="{ row }">
            <span class="coord-text">{{ row.lng?.toFixed(3) }}, {{ row.lat?.toFixed(3) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="leader_name" label="负责团长" width="120" />
        <el-table-column label="站点状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.station_status)" size="small">
              {{ getStatusText(row.station_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewOrders(row)">
              订单
            </el-button>
            <el-button type="success" link size="small" @click="editCommunity(row)">
              编辑
            </el-button>
            <el-button type="warning" link size="small" @click="viewMap(row)">
              地图
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑小区' : '新增小区'" width="600px">
      <el-form :model="communityForm" label-width="100px">
        <el-form-item label="小区名称">
          <el-input v-model="communityForm.name" placeholder="请输入小区名称" />
        </el-form-item>
        <el-form-item label="小区地址">
          <el-input v-model="communityForm.address" placeholder="请输入详细地址" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="经度">
              <el-input-number v-model="communityForm.lng" :precision="6" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度">
              <el-input-number v-model="communityForm.lat" :precision="6" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="负责团长">
          <el-select v-model="communityForm.leader_id" placeholder="请选择团长" style="width: 100%;">
            <el-option
              v-for="l in leaders"
              :key="l.id"
              :label="l.name"
              :value="l.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="站点状态">
          <el-radio-group v-model="communityForm.station_status">
            <el-radio value="normal">正常</el-radio>
            <el-radio value="busy">繁忙</el-radio>
            <el-radio value="idle">空闲</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCommunity">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const router = useRouter()

const communities = ref([])
const loading = ref(false)
const leaders = ref([])
const showAddDialog = ref(false)
const isEdit = ref(false)

const communityForm = reactive({
  id: null,
  name: '',
  address: '',
  lng: 116.4,
  lat: 39.9,
  leader_id: null,
  station_status: 'normal'
})

async function loadCommunities() {
  loading.value = true
  try {
    if (window.electronAPI) {
      communities.value = await window.electronAPI.getCommunities()
    } else {
      communities.value = [
        { id: 1, name: '阳光花园', address: '朝阳区阳光路88号', lng: 116.489, lat: 39.928, leader_id: 1, leader_name: '张团长', station_status: 'busy', created_at: '2024-01-01 10:00:00' },
        { id: 2, name: '幸福里小区', address: '海淀区幸福街66号', lng: 116.325, lat: 39.967, leader_id: 2, leader_name: '李团长', station_status: 'normal', created_at: '2024-01-05 10:00:00' },
        { id: 3, name: '绿城家园', address: '丰台区绿城市政路12号', lng: 116.286, lat: 39.856, leader_id: null, leader_name: '-', station_status: 'idle', created_at: '2024-01-10 10:00:00' },
        { id: 4, name: '金茂府', address: '朝阳区金茂路18号', lng: 116.478, lat: 39.915, leader_id: null, leader_name: '-', station_status: 'busy', created_at: '2024-02-01 10:00:00' },
        { id: 5, name: '万科城市花园', address: '昌平区万科路8号', lng: 116.234, lat: 40.123, leader_id: null, leader_name: '-', station_status: 'normal', created_at: '2024-02-15 10:00:00' }
      ]
    }
  } finally {
    loading.value = false
  }
}

function loadLeaders() {
  leaders.value = [
    { id: 1, name: '张团长' },
    { id: 2, name: '李团长' }
  ]
}

function getStatusType(status) {
  const map = { busy: 'danger', normal: '', idle: 'success' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { busy: '繁忙', normal: '正常', idle: '空闲' }
  return map[status] || status
}

function viewOrders(row) {
  ElMessage.info(`查看${row.name}的订单`)
}

function editCommunity(row) {
  isEdit.value = true
  Object.assign(communityForm, row)
  showAddDialog.value = true
}

function viewMap(row) {
  router.push('/map')
}

function submitCommunity() {
  if (!communityForm.name) {
    ElMessage.warning('请输入小区名称')
    return
  }
  ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
  showAddDialog.value = false
  loadCommunities()
}

onMounted(() => {
  loadCommunities()
  loadLeaders()
})
</script>

<style scoped>
.coord-text {
  font-family: monospace;
  font-size: 13px;
  color: #606266;
}
</style>
