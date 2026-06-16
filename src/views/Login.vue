<template>
  <div class="login-container">
    <div class="login-bg">
      <div class="bg-overlay"></div>
    </div>
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon :size="48" color="#409eff"><Shop /></el-icon>
        </div>
        <h1 class="title">社区生鲜团购</h1>
        <p class="subtitle">智能调度与库存管理系统</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginData"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-tabs v-model="activeRole" class="role-tabs">
          <el-tab-pane label="运营主管" name="admin">
            <template #label>
              <el-icon><UserFilled /></el-icon>
              <span>运营主管</span>
            </template>
          </el-tab-pane>
          <el-tab-pane label="团长" name="leader">
            <template #label>
              <el-icon><Avatar /></el-icon>
              <span>团长</span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <el-form-item prop="username">
          <el-input
            v-model="loginData.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginData.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>
          <el-icon><InfoFilled /></el-icon>
          运营主管：admin / admin123
        </p>
        <p>
          <el-icon><InfoFilled /></el-icon>
          团长：leader1 / 123456
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElForm } from 'element-plus'
import { Shop, UserFilled, Avatar, InfoFilled } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loginData = reactive({
  username: 'admin',
  password: 'admin123'
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const loginFormRef = ref(null)
const loading = ref(false)
const activeRole = ref('admin')

function handleLogin() {
  loginFormRef.value?.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      let result
      if (window.electronAPI) {
        result = await window.electronAPI.login(loginData.username, loginData.password)
      } else {
        result = mockLogin(loginData.username, loginData.password)
      }

      if (result.success) {
        userStore.login(result.user)
        ElMessage.success('登录成功')
        router.push('/')
      } else {
        ElMessage.error(result.message || '登录失败')
      }
    } catch (error) {
      ElMessage.error('登录失败，请稍后重试')
      console.error(error)
    } finally {
      loading.value = false
    }
  })
}

function mockLogin(username, password) {
  const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '系统管理员', phone: '13800138000' },
    { id: 2, username: 'leader1', password: '123456', role: 'leader', name: '张团长', phone: '13900139001' }
  ]

  const user = users.find(u => u.username === username && u.password === password)
  if (user) {
    const { password: _, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  }
  return { success: false, message: '用户名或密码错误' }
}

onMounted(() => {
  userStore.initFromStorage()
  if (userStore.isLoggedIn) {
    router.push('/')
  }
})
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%);
}

.login-card {
  width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.logo-icon :deep(svg) {
  color: #fff;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #909399;
}

.login-form {
  margin-top: 20px;
}

.role-tabs {
  margin-bottom: 20px;
}

.role-tabs :deep(.el-tabs__item) {
  font-size: 15px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 8px;
  margin-top: 10px;
}

.login-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.login-footer p {
  font-size: 12px;
  color: #909399;
  margin: 6px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
