<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">配送员排班</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          新增排班
        </el-button>
      </div>
    </div>

    <div class="schedule-calendar">
      <div class="calendar-header">
        <el-button @click="prevWeek" circle>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <span class="week-title">{{ weekStart }} - {{ weekEnd }}</span>
        <el-button @click="nextWeek" circle>
          <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button type="primary" size="small" @click="goToToday" style="margin-left: 16px;">
          本周
        </el-button>
      </div>

      <div class="calendar-grid">
        <div class="calendar-header-row">
          <div class="calendar-time-header">配送员</div>
          <div
            v-for="day in weekDays" :key="day.date"
            class="calendar-day-header"
            :class="{ today: day.isToday }"
          >
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">{{ day.date }}</div>
          </div>
        </div>

        <div v-for="person in deliveryPersonnel" :key="person.id" class="calendar-row">
          <div class="calendar-person">
          <el-avatar :size="32" :icon="UserFilled" />
            <span class="person-name">{{ person.name }}</span>
            <el-tag size="small" :type="person.status === 'available' ? 'success' : 'warning'">
              {{ person.status === 'available' ? '在岗' : '休假' }}
            </el-tag>
          </div>
          <div
            v-for="day in weekDays" :key="day.date"
            class="calendar-cell"
          >
            <div v-if="getSchedule(person.id, day.date)" class="schedule-item">
              <div class="schedule-time">
                {{ getSchedule(person.id, day.date)?.shift_start }} - 
                {{ getSchedule(person.id, day.date)?.shift_end }}
              </div>
              <div class="schedule-area">
                {{ getSchedule(person.id, day.date)?.area || '全城配送' }}
              </div>
            </div>
            <div v-else class="no-schedule">休息</div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showAddDialog" title="新增排班" width="500px">
      <el-form :model="scheduleForm" label-width="100px">
        <el-form-item label="配送员">
          <el-select v-model="scheduleForm.personId" placeholder="请选择配送员" style="width: 100%;">
            <el-option
              v-for="p in deliveryPersonnel"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排班日期">
          <el-date-picker
            v-model="scheduleForm.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="班次时间">
          <el-time-picker
            v-model="scheduleForm.timeRange"
            is-range
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="HH:mm"
            value-format="HH:mm"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="负责区域">
          <el-input v-model="scheduleForm.area" placeholder="请输入负责区域" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitSchedule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, ArrowLeft, ArrowRight, UserFilled } from '@element-plus/icons-vue'

const currentWeekStart = ref(new Date())
const deliveryPersonnel = ref([])
const schedules = ref([])
const showAddDialog = ref(false)
const scheduleForm = reactive({
  personId: null,
  date: '',
  timeRange: [],
  area: ''
})

const weekDays = computed(() => {
  const start = new Date(currentWeekStart.value)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)

  const days = []
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const today = new Date().toDateString()

  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({
      date: d.toISOString().slice(0, 10),
      dayName: dayNames[d.getDay()],
      isToday: d.toDateString() === today
    })
  }
  return days
})

const weekStart = computed(() => weekDays.value[0]?.date || '')
const weekEnd = computed(() => weekDays.value[6]?.date || '')

function prevWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
}

function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
}

function goToToday() {
  currentWeekStart.value = new Date()
}

function getSchedule(personId, date) {
  return schedules.value.find(s => s.delivery_person_id === personId && s.date === date)
}

async function loadPersonnel() {
  if (window.electronAPI) {
    deliveryPersonnel.value = await window.electronAPI.getDeliveryPersonnel()
    schedules.value = await window.electronAPI.getDeliverySchedules()
  } else {
    deliveryPersonnel.value = [
      { id: 1, name: '王师傅', phone: '13600136001', vehicle_type: '电动三轮车', status: 'available' },
      { id: 2, name: '李师傅', phone: '13600136002', vehicle_type: '电动三轮车', status: 'available' },
      { id: 3, name: '张师傅', phone: '13600136003', vehicle_type: '面包车', status: 'delivering' },
      { id: 4, name: '刘师傅', phone: '13600136004', vehicle_type: '电动三轮车', status: 'available' }
    ]

    const today = new Date()
    const shifts = [
      { shift_start: '08:00', shift_end: '16:00', area: '朝阳区' },
      { shift_start: '09:00', shift_end: '17:00', area: '海淀区' },
      { shift_start: '10:00', shift_end: '18:00', area: '丰台区' }
    ]

    schedules.value = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - today.getDay() + 1 + i)
      const dateStr = d.toISOString().slice(0, 10)
      if (i < 5) {
        schedules.value.push({
          id: i * 4 + 1,
          delivery_person_id: 1,
          date: dateStr,
          ...shifts[0]
        })
        schedules.value.push({
          id: i * 4 + 2,
          delivery_person_id: 2,
          date: dateStr,
          ...shifts[1]
        })
        schedules.value.push({
          id: i * 4 + 3,
          delivery_person_id: 3,
          date: dateStr,
          ...shifts[2]
        })
      }
      if (i < 6) {
        schedules.value.push({
          id: i * 4 + 4,
          delivery_person_id: 4,
          date: dateStr,
          shift_start: '07:00',
          shift_end: '15:00',
          area: '昌平区'
        })
      }
    }
  }
}

function submitSchedule() {
  if (!scheduleForm.personId || !scheduleForm.date || !scheduleForm.timeRange?.length) {
    ElMessage.warning('请填写完整信息')
    return
  }
  ElMessage.success('排班已添加')
  showAddDialog.value = false
  loadPersonnel()
}

onMounted(() => {
  loadPersonnel()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.schedule-calendar {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  gap: 16px;
}

.week-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  min-width: 240px;
  text-align: center;
}

.calendar-grid {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-header-row {
  display: flex;
  background: #f5f7fa;
}

.calendar-time-header {
  width: 160px;
  min-width: 160px;
  padding: 12px;
  font-weight: 600;
  color: #303133;
  border-right: 1px solid #ebeef5;
  text-align: center;
}

.calendar-day-header {
  flex: 1;
  padding: 12px;
  text-align: center;
  border-right: 1px solid #ebeef5;
}

.calendar-day-header:last-child {
  border-right: none;
}

.calendar-day-header.today {
  background: #ecf5ff;
}

.day-name {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.day-date {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.calendar-row {
  display: flex;
  border-top: 1px solid #ebeef5;
}

.calendar-person {
  width: 160px;
  min-width: 160px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-right: 1px solid #ebeef5;
  background: #fafafa;
}

.person-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.calendar-cell {
  flex: 1;
  min-height: 80px;
  padding: 8px;
  border-right: 1px solid #ebeef5;
  background: #fff;
}

.calendar-cell:last-child {
  border-right: none;
}

.schedule-item {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
}

.schedule-time {
  color: #409eff;
  font-weight: 500;
  margin-bottom: 4px;
}

.schedule-area {
  color: #606266;
  font-size: 11px;
}

.no-schedule {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
}
</style>
