<template>
  <div>
    <Transition name="splash">
      <div v-if="splash.active"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <div class="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin mb-8"></div>
        <p class="text-[var(--text-secondary)] text-sm uppercase tracking-widest mb-2">Welcome</p>
        <h1 class="text-4xl font-bold text-white">{{ splash.name }}</h1>
      </div>
    </Transition>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { splash } = useSplash()
</script>

<style>
.splash-enter-active { transition: opacity 0.15s ease; }
.splash-leave-active { transition: opacity 0.3s ease; }
.splash-enter-from,
.splash-leave-to  { opacity: 0; }
</style>
