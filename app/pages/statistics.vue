<template>
  <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] text-white font-sans selection:bg-purple-500 selection:text-white">
    <NavBar title="Statistics" :showBack="true" backTo="/album" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header class="mb-12 text-center">
        <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
          Data Insights
        </h1>
        <p class="text-gray-400 max-w-2xl mx-auto text-lg">
          A deep dive into your photography habits and storage metrics.
        </p>
      </header>

      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>

      <div v-else-if="error" class="text-center text-red-400 p-8 bg-red-900/10 rounded-xl border border-red-900/20">
        <p>Failed to load statistics.</p>
        <p class="text-sm mt-2">{{ error }}</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Storage Card -->
        <div class="md:col-span-2 bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl p-8 border border-[var(--glass-border-light)] shadow-xl relative overflow-hidden group hover:border-[var(--btn-primary-end)] transition-all duration-500">
          <div class="absolute top-0 right-0 p-32 bg-[var(--btn-primary-end)]/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[var(--btn-primary-end)]/20 transition-all duration-700"></div>
          
          <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Storage Used
              </h2>
              <p class="text-[var(--text-muted)]">Total space consumed by your original photos.</p>
            </div>
            <div class="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-muted)]">
              {{ formatBytes(stats?.storage?.totalBytes || 0) }}
            </div>
          </div>
        </div>

        <!-- Cameras Section -->
        <div class="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl p-6 border border-[var(--glass-border-light)] shadow-xl hover:border-[var(--btn-primary-start)] transition-all duration-500 flex flex-col">
          <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[var(--btn-primary-start)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Top Cameras
          </h2>
          
          <div v-if="!stats?.cameras?.length" class="text-[var(--text-muted)] text-center py-8">No camera data available</div>
          
          <div class="space-y-4 flex-1">
            <div v-for="(camera, index) in stats?.cameras?.slice(0, 5)" :key="index" class="relative group">
              <div class="flex justify-between items-end mb-1 text-sm font-medium relative z-10">
                 <span class="text-[var(--text-primary)] group-hover:text-[var(--btn-primary-start)] transition-colors">{{ camera.model }}</span>
                 <span class="text-[var(--text-muted)]">{{ camera.count }} shots</span>
              </div>
              <div class="w-full bg-[var(--glass-bg-strong)] rounded-full h-2.5 overflow-hidden">
                <div class="bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-active)] h-2.5 rounded-full transition-all duration-1000 ease-out" 
                     :style="{ width: `${calculatePercentage(camera.count, stats.cameras[0].count)}%` }">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lenses Section -->
        <div class="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl p-6 border border-[var(--glass-border-light)] shadow-xl hover:border-[var(--btn-primary-end)] transition-all duration-500 flex flex-col">
          <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-[var(--btn-primary-end)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Top Lenses
          </h2>

          <div v-if="!stats?.lenses?.length" class="text-[var(--text-muted)] text-center py-8">No lens data available</div>

          <div class="space-y-4 flex-1">
            <div v-for="(lens, index) in stats?.lenses?.slice(0, 5)" :key="index" class="relative group">
              <div class="flex justify-between items-end mb-1 text-sm font-medium relative z-10">
                 <span class="text-[var(--text-primary)] group-hover:text-[var(--btn-primary-end)] transition-colors">{{ lens.model }}</span>
                 <span class="text-[var(--text-muted)]">{{ lens.count }} shots</span>
              </div>
              <div class="w-full bg-[var(--glass-bg-strong)] rounded-full h-2.5 overflow-hidden">
                <div class="bg-gradient-to-r from-[var(--btn-primary-end)] to-[var(--btn-primary-hover-end)] h-2.5 rounded-full transition-all duration-1000 ease-out" 
                     :style="{ width: `${calculatePercentage(lens.count, stats.lenses[0].count)}%` }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const stats = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Format bytes to human readable string
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Calculate percentage relative to the max value (first item in sorted list)
const calculatePercentage = (value: number, max: number) => {
  if (!max) return 0
  return (value / max) * 100
}

onMounted(async () => {
    try {
        loading.value = true
        const data = await $fetch('/api/v1/stats')
        stats.value = data
    } catch (e: any) {
        error.value = e.message || 'An unknown error occurred'
    } finally {
        loading.value = false
    }
})
</script>
