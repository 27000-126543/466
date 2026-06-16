<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">团长管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        新增团长
      </el-button>
    </div>

    <div class="table-container">
      <el-table :data="leaders" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="70" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :size="40" :icon="UserFilled" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="id_card" label="身份证号" width="180" />
        <el-table-column prop="community_name" label="负责小区" width="140" />
        <el-table-column prop="profit_rate" label="分润比例" width="100">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: 500;">{{ (row.profit_rate * 100).toFixed(1) }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="入职时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewProfit(row)">
              分润
            </el-button>
            <el-button type="success" link size="small" @click="viewOrders(row)">
              订单
            </el-button>
            <el-button type="warning" link size="small" @click="editLeader(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showAddDialog" :title="isEdit ? '编辑团长' : '新增团长'" width="600px">
      <el-form :model="leaderForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名">
              <el-input v-model="leaderForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号">
              <el-input v-model="leaderForm.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="身份证号">
          <el-input v-model="leaderForm.id_card" placeholder="请输入身份证号" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责小区">
              <el-select v-model="leaderForm.community_id" placeholder="请选择小区" style="width: 100%;">
                <el-option
                  v-for="c in communities"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分润比例">
              <el-input-number
                v-model="leaderForm.profit_rate"
                :min="0.01"
                :max="0.5"
                :step="0.01"
                :precision="2"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="登录账号">
          <el-input v-model="leaderForm.username" placeholder="请设置登录用户名" />
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="leaderForm.password" placeholder="请设置初始密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitLeader">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, UserFilled } from '@element-plus/icons-vue'

const leaders = ref([])
const loading = ref(false)
const communities = ref([])
const showAddDialog = ref(false)
const isEdit = ref(false)

const leaderForm = reactive({
  id: null,
  name: '',
  phone: '',
  id_card: '',
  community_id: null,
  profit_rate: 0.08,
  username: '',
  password: ''
})

async function loadLeaders() {
  loading.value = true
  try {
    if (window.electronAPI) {
      leaders.value = await window.electronAPI.getLeaders()
    } else {
      leaders.value = [
        { id: 1, user_id: 2, name: '张团长', phone: '13900139001', id_card: '110101199001011234', community_id: 1, community_name: '阳光花园', profit_rate: 0.08, status: 'active', created_at: '2024-01-01 10:00:00' },
        { id: 2, user_id: 3, name: '李团长', phone: '13900139002', id_card: '110101199202022345', community_id: 2, community_name: '幸福里小区', profit_rate: 0.1, status: 'active', created_at: '2024-01-15 10:00:00' }
      ]
    }
  } finally {
    loading.value = false
  }
}

function loadCommunities() {
  communities.value = [
    { id: 1, name: '阳光花园' },
    { id: 2, name: '幸福里小区' },
    { id: 3, name: '绿城家园' },
    { id: 4, name: '金茂府' },
    { id: 5, name: '万科城市花园' }
  ]
}

function viewProfit(row) {
  ElMessage.info(`查看${row.name}的分润明细`)
}

function viewOrders(row) {
  ElMessage.info(`查看${row.name}的订单`)
}

function editLeader(row) {
  isEdit.value = true
  Object.assign(leaderForm, row)
  showAddDialog.value = true
}

function submitLeader() {
  if (!leaderForm.name) {
    ElMessage.warning('请输入姓名')
    return
  }
  if (!leaderForm.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
  showAddDialog.value = false
  loadLeaders()
}

onMounted(() => {
  loadLeaders()
  loadCommunities()
})
</script>

<style scoped>
</style>
