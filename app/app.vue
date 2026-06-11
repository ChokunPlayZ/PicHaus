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
