import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref('')

  const isLoggedIn = computed(() => !!user.value)
  const userRole = computed(() => user.value?.role || '')
  const userName = computed(() => user.value?.name || '')

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

  function initFromStorage() {
    const saved = localStorage.getItem('user')
    if (saved) {
      try {
        user.value = JSON.parse(saved)
        token.value = 'mock-token-' + Date.now()
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
    login,
    logout,
    initFromStorage
  }
})
