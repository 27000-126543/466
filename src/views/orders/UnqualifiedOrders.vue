<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">不合格订单</h2>
      <el-button type="primary" @click="loadData" :icon="Refresh">
        刷新
      </el-button>
    </div>

    <div class="table-container">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="140" />
        <el-table-column prop="customer_name" label="客户姓名" width="100" />
        <el-table-column prop="customer_phone" label="联系电话" width="130" />
        <el-table-column prop="community_name" label="所属小区" width="140" />
        <el-table-column prop="leader_name" label="负责团长" width="100" />
        <el-table-column prop="delivery_address" label="收货地址" min-width="180" show-overflow-tooltip />
        <el-table-column label="支付状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.payment_status === 'paid' ? 'success' : 'danger'" size="small">
              {{ row.payment_status === 'paid' ? '已支付' : '未支付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="地址验证" width="90">
          <template #default="{ row }">
            <el-tag :type="row.address_verified ? 'success' : 'danger'" size="small">
              {{ row.address_verified ? '完整' : '不完整' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="不合格原因" min-width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="下单时间" width="150" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row.id)">
              详情
            </el-button>
            <el-button type="success" link size="small" @click="notifyLeader(row)" v-if="!row.notified">
              通知团长
            </el-button>
            <el-button type="warning" link size="small" @click="revalidate(row)">
              重新审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-empty v-if="!loading && orders.length === 0" description="暂无不合格订单" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const orders = ref([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    if (window.electronAPI) {
      orders.value = await window.electronAPI.getUnqualifiedOrders()
    } else {
      orders.value = [
        {
          id: 1,
          order_no: 'DD240001',
          customer_name: '测试用户',
          customer_phone: '13800000001',
          community_name: '阳光花园',
          leader_name: '张团长',
          delivery_address: '阳光花园',
          payment_status: 'unpaid',
          address_verified: 0,
          remark: '不合格原因：收货地址不完整；支付未完成',
          created_at: '2024-06-16 10:00:00'
        }
      ]
    }
  } finally {
    loading.value = false
  }
}

function viewDetail(id) {
  router.push(`/orders/${id}`)
}

function notifyLeader(row) {
  if (window.electronAPI) {
    window.electronAPI.markOrderUnqualified(row.id, '请尽快修改订单信息')
  }
  ElMessage.success('已推送团长修改提示')
  row.notified = true
}

async function revalidate(row) {
  if (window.electronAPI) {
    const result = await window.electronAPI.validateOrder(row.id)
    if (result.qualified) {
      ElMessage.success('重新审核通过')
    } else {
      ElMessage.warning('订单仍不合格：' + result.issues?.join('; '))
    }
    loadData()
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
</style>
