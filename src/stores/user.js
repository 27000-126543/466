import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref('')

  const isLoggedIn = computed(() => !!user.value)
  const userRole = computed(() => user.value?.role || '')
  const userName = computed(() => user.value?.name || '')
  const leaderId = computed(() => user.value?.leader_id || null)
  const userId = computed(() => user.value?.id || null)

  function login(userData) {
    user.value = userData
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('user')
  }

  async function initFromStorage() {
    const saved = localStorage.getItem('user')
    if (saved) {
      try {
        const savedUser = JSON.parse(saved)
        user.value = savedUser
        token.value = 'mock-token-' + Date.now()
        if (savedUser.role === 'leader' && !savedUser.leader_id && window.electronAPI) {
          try {
            const result = await window.electronAPI.login(savedUser.username, savedUser.password || '')
            if (result && result.success && result.user) {
              user.value = result.user
              localStorage.setItem('user', JSON.stringify(result.user))
            }
          } catch (e) {
            console.warn('重新获取团长信息失败:', e)
          }
        }
      } catch (e) {
        console.error('Failed to parse saved user:', e)
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    userRole,
    userName,
    leaderId,
    userId,
    login,
    logout,
    initFromStorage
  }
})
