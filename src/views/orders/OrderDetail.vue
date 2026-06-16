<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" link>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">订单详情</h2>
        <el-tag :type="getStatusType(order?.order_status)" size="large">
          {{ getStatusText(order?.order_status) }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button v-if="order?.order_status === 'pending'" type="primary" @click="validateOrder">
          <el-icon><CircleCheck /></el-icon>
          审核订单
        </el-button>
        <el-button v-if="order?.order_status === 'qualified'" type="success" @click="startSorting">
          <el-icon><Tickets /></el-icon>
          开始分拣
        </el-button>
        <el-button v-if="order?.order_status === 'sorting'" type="warning" @click="startDelivery">
          <el-icon><Van /></el-icon>
          安排配送
        </el-button>
        <el-button v-if="order?.order_status === 'delivered'" type="success" @click="completeOrder">
          <el-icon><Check /></el-icon>
          确认完成
        </el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="16">
        <div class="detail-card">
          <h3 class="card-title">
            <el-icon color="#409eff"><Document /></el-icon>
            基本信息
          </h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单号">{{ order?.order_no }}</el-descriptions-item>
            <el-descriptions-item label="下单时间">{{ order?.created_at }}</el-descriptions-item>
            <el-descriptions-item label="客户姓名">{{ order?.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ order?.customer_phone }}</el-descriptions-item>
            <el-descriptions-item label="所属小区">{{ order?.community_name }}</el-descriptions-item>
            <el-descriptions-item label="负责团长">{{ order?.leader_name }}</el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="2">{{ order?.delivery_address }}</el-descriptions-item>
            <el-descriptions-item label="支付状态">
              <el-tag :type="order?.payment_status === 'paid' ? 'success' : 'warning'" size="small">
                {{ order?.payment_status === 'paid' ? '已支付' : '待支付' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="地址验证">
              <el-tag :type="order?.address_verified ? 'success' : 'danger'" size="small">
                {{ order?.address_verified ? '已验证' : '未验证' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="截止时间">{{ order?.deadline }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ order?.updated_at }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ order?.remark || '无' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-card">
          <h3 class="card-title">
            <el-icon color="#67c23a"><ShoppingCart /></el-icon>
            商品明细
          </h3>
          <el-table :data="orderItems" border stripe>
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="product_name" label="商品名称" />
            <el-table-column prop="quantity" label="数量" width="100" />
            <el-table-column prop="unit_price" label="单价(元)" width="120">
              <template #default="{ row }">¥{{ row.unit_price?.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="subtotal" label="小计(元)" width="120">
              <template #default="{ row }">
                <span style="color: #f56c6c; font-weight: 500;">¥{{ row.subtotal?.toFixed(2) }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="order-total">
            合计：<span class="total-amount">¥{{ totalAmount?.toFixed(2) }}</span>
          </div>
        </div>

        <div class="detail-card">
          <h3 class="card-title">
            <el-icon color="#e6a23c"><Timer /></el-icon>
            状态流转
          </h3>
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step title="已下单" description="订单已提交" />
            <el-step title="已审核" description="地址支付已验证" />
            <el-step title="分拣中" description="商品分拣中" />
            <el-step title="配送中" description="配送员配送中" />
            <el-step title="已完成" description="客户已签收" />
          </el-steps>
        </div>
      </el-col>

      <el-col :span="8">
        <div class="detail-card">
          <h3 class="card-title">
            <el-icon color="#f56c6c"><Money /></el-icon>
            费用明细
          </h3>
          <div class="fee-item">
            <span>商品总额</span>
            <span>¥{{ totalAmount?.toFixed(2) }}</span>
          </div>
          <div class="fee-item">
            <span>配送费</span>
            <span>¥0.00</span>
          </div>
          <div class="fee-item">
            <span>优惠券</span>
            <span>-¥0.00</span>
          </div>
          <div class="fee-item total">
            <span>实付金额</span>
            <span class="total-amount">¥{{ totalAmount?.toFixed(2) }}</span>
          </div>
        </div>

        <div class="detail-card">
          <h3 class="card-title">
            <el-icon color="#909399"><Service /></el-icon>
            售后信息
          </h3>
          <div v-if="afterSales.length === 0" class="empty-aftersale">
            <el-empty description="暂无售后记录" :image-size="80" />
          </div>
          <div v-else class="aftersale-list">
            <div v-for="item in afterSales" :key="item.id" class="aftersale-item">
              <div class="aftersale-header">
                <span class="aftersale-no">{{ item.after_sale_no }}</span>
                <el-tag size="small">{{ getAfterSaleStatus(item.status) }}</el-tag>
              </div>
              <div class="aftersale-type">{{ getAfterSaleType(item.type) }}</div>
              <div class="aftersale-amount">金额：¥{{ item.amount?.toFixed(2) }}</div>
            </div>
          </div>
          <el-button type="primary" plain style="width: 100%; margin-top: 12px;">
            申请售后
          </el-button>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, CircleCheck, Tickets, Van, Check, Document,
  ShoppingCart, Timer, Money, Service
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const order = ref(null)
const orderItems = ref([])
const afterSales = ref([])

const totalAmount = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + (item.subtotal || 0), 0)
})

const currentStep = computed(() => {
  const statusMap = {
    pending: 0,
    qualified: 1,
    sorting: 2,
    delivering: 3,
    delivered: 3,
    completed: 4,
    unqualified: 0
  }
  return statusMap[order.value?.order_status] || 0
})

async function loadOrderDetail() {
  const id = route.params.id
  if (window.electronAPI) {
    order.value = await window.electronAPI.getOrderById(id)
    orderItems.value = order.value?.items || []
    const sales = await window.electronAPI.getAfterSales()
    afterSales.value = sales.filter(s => s.order_id == id)
  } else {
    order.value = {
      id: id,
      order_no: 'DD240001',
      customer_name: '张三',
      customer_phone: '13800138000',
      community_name: '阳光花园',
      leader_name: '张团长',
      delivery_address: '阳光花园1号楼1单元101室',
      total_amount: 89.50,
      payment_status: 'paid',
      order_status: 'qualified',
      address_verified: 1,
      deadline: '2024-06-18 18:00:00',
      remark: '请放在自提点',
      created_at: '2024-06-16 10:30:00',
      updated_at: '2024-06-16 11:00:00'
    }
    orderItems.value = [
      { id: 1, product_name: '有机白菜', quantity: 2, unit_price: 3.5, subtotal: 7.0 },
      { id: 2, product_name: '红富士苹果', quantity: 3, unit_price: 8.9, subtotal: 26.7 },
      { id: 3, product_name: '鸡蛋', quantity: 1, unit_price: 15.8, subtotal: 15.8 }
    ]
    afterSales.value = []
  }
}

function goBack() {
  router.back()
}

async function validateOrder() {
  if (window.electronAPI) {
    const result = await window.electronAPI.validateOrder(route.params.id)
    if (result.qualified) {
      ElMessage.success('订单审核通过')
      loadOrderDetail()
    } else {
      ElMessage.warning('订单存在问题：' + result.issues?.join('; '))
    }
  }
}

async function startSorting() {
  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.deductStock(route.params.id)
      if (result.success) {
        ElMessage.success('已开始分拣，库存已扣减')
        loadOrderDetail()
      } else {
        if (result.insufficientItems && result.insufficientItems.length > 0) {
          const itemNames = result.insufficientItems.map(
            item => `${item.product_name}（需${item.required}，库存${item.available}）`
          ).join('；')
          ElMessage.error('库存不足，无法分拣：' + itemNames)
        } else {
          ElMessage.error(result.message || '分拣失败，请重试')
        }
      }
    } catch (e) {
      ElMessage.error('分拣失败：' + e.message)
    }
  } else {
    ElMessage.success('已开始分拣，库存已扣减')
    loadOrderDetail()
  }
}

function startDelivery() {
  ElMessage.info('请在配送管理中安排配送')
  router.push('/delivery')
}

async function completeOrder() {
  if (window.electronAPI) {
    await window.electronAPI.updateOrderStatus(route.params.id, 'completed')
    ElMessage.success('订单已完成')
    loadOrderDetail()
  }
}

function getStatusText(status) {
  const map = {
    pending: '待审核',
    qualified: '已审核',
    sorting: '分拣中',
    delivering: '配送中',
    delivered: '已送达',
    completed: '已完成',
    unqualified: '不合格'
  }
  return map[status] || status
}

function getStatusType(status) {
  const map = {
    pending: 'warning',
    qualified: 'primary',
    sorting: 'info',
    delivering: '',
    delivered: 'success',
    completed: 'success',
    unqualified: 'danger'
  }
  return map[status] || 'info'
}

function getAfterSaleType(type) {
  const map = { return: '退货', exchange: '换货', refund: '退款' }
  return map[type] || type
}

function getAfterSaleStatus(status) {
  const map = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    pending_approval: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return map[status] || status
}

onMounted(() => {
  loadOrderDetail()
})
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 10px;
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

.order-total {
  margin-top: 16px;
  text-align: right;
  font-size: 14px;
  color: #606266;
}

.total-amount {
  color: #f56c6c;
  font-size: 20px;
  font-weight: 600;
  margin-left: 8px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px dashed #ebeef5;
  font-size: 14px;
  color: #606266;
}

.fee-item.total {
  border-bottom: none;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  padding-top: 16px;
}

.empty-aftersale {
  padding: 20px 0;
}

.aftersale-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aftersale-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.aftersale-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.aftersale-no {
  font-size: 13px;
  color: #409eff;
}

.aftersale-type {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.aftersale-amount {
  font-size: 13px;
  color: #f56c6c;
}
</style>
