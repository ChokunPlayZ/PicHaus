<template>
  <div>
    <Transition name="splash">
      <div v-if="splash.active"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style="background: var(--bg-page);">
        <div class="w-10 h-10 rounded-full border-2 animate-spin mb-8"
          style="border-color: var(--separator); border-top-color: var(--accent);"></div>
        <p class="text-sm uppercase tracking-widest mb-2" style="color: var(--text-3);">Welcome</p>
        <h1 class="text-4xl font-bold" style="color: var(--text-1);">{{ splash.name }}</h1>
      </div>
    </Transition>

    <!-- Impersonation banner -->
    <div v-if="isImpersonating"
      class="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-between px-4 py-2 text-xs font-medium"
      style="background: #d97706; color: white;">
      <span>Impersonation active — viewing as another user</span>
      <button @click="returnToAdmin" class="underline ml-4 opacity-90 hover:opacity-100">Return to Admin</button>
    </div>

    <NuxtPage />
    <CommandPalette />
  </div>
</template>

<script setup lang="ts">
import { setAuthToken } from '~/utils/auth-client'

const IMPERSONATE_RETURN_KEY = 'pichaus_impersonate_return_token'

const { splash } = useSplash()
const { loadSettings } = useSiteSettings()
const isImpersonating = ref(false)

onMounted(() => {
    loadSettings()
    isImpersonating.value = !!localStorage.getItem(IMPERSONATE_RETURN_KEY)
})

const returnToAdmin = () => {
    const adminToken = localStorage.getItem(IMPERSONATE_RETURN_KEY)
    if (adminToken) {
        localStorage.removeItem(IMPERSONATE_RETURN_KEY)
        setAuthToken(adminToken)
        isImpersonating.value = false
        navigateTo('/admin/users')
    }
}
</script>

<style>
.splash-enter-active { transition: opacity 0.15s ease; }
.splash-leave-active { transition: opacity 0.3s ease; }
.splash-enter-from,
.splash-leave-to  { opacity: 0; }
</style>
