<template>
  <div class="min-h-screen" style="background: var(--bg-page);">
    <NavBar title="Statistics" :showBack="true" backTo="/album" />

    <div class="px-4 sm:px-6 lg:px-8 py-12">
      <header class="mb-10">
        <h1 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--text-1);">Data Insights</h1>
        <p class="text-sm" style="color: var(--text-2);">
          A deep dive into your photography habits and storage metrics.
        </p>
      </header>

      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="w-10 h-10 rounded-full border-2 animate-spin"
          style="border-color: var(--separator); border-top-color: var(--accent);"></div>
      </div>

      <div v-else-if="error" class="rounded-xl px-4 py-3 text-sm"
        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
        <p class="font-medium">Failed to load statistics.</p>
        <p class="mt-1 text-xs opacity-80">{{ error }}</p>
      </div>

      <div v-else class="space-y-6">

        <!-- At a Glance -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="rounded-2xl p-5 flex items-center gap-4"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <div class="p-3 rounded-xl" style="background: var(--accent-light);">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" style="color: var(--accent);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium mb-0.5" style="color: var(--text-3);">Total Photos</div>
              <div class="text-2xl font-bold" style="color: var(--text-1);">{{ stats?.totals?.photos?.toLocaleString() || 0 }}</div>
            </div>
          </div>
          <div class="rounded-2xl p-5 flex items-center gap-4"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <div class="p-3 rounded-xl" style="background: var(--success-bg);">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" style="color: var(--success-text);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium mb-0.5" style="color: var(--text-3);">Total Albums</div>
              <div class="text-2xl font-bold" style="color: var(--text-1);">{{ stats?.totals?.albums?.toLocaleString() || 0 }}</div>
            </div>
          </div>
          <div class="rounded-2xl p-5 flex items-center gap-4"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <div class="p-3 rounded-xl" style="background: var(--surface-3);">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" style="color: var(--text-2);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <div class="text-xs font-medium mb-0.5" style="color: var(--text-3);">Storage Used</div>
              <div class="text-2xl font-bold" style="color: var(--text-1);">{{ formatBytes(stats?.storage?.totalBytes || 0) }}</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Cameras Section -->
          <div class="rounded-2xl p-6 flex flex-col"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <h2 class="text-base font-semibold mb-5 flex items-center gap-2" style="color: var(--text-1);">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" style="color: var(--accent);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Top Cameras
            </h2>

            <div v-if="!stats?.cameras?.length" class="text-sm text-center py-8" style="color: var(--text-3);">No camera data available</div>

            <div class="space-y-4 flex-1">
              <div v-for="(camera, index) in stats?.cameras?.slice(0, 5)" :key="index">
                <div class="flex justify-between items-end mb-1.5 text-sm">
                  <span class="font-medium" style="color: var(--text-1);">{{ camera.model }}</span>
                  <span style="color: var(--text-3);">{{ camera.count }} shots</span>
                </div>
                <div class="w-full rounded-full h-1.5 overflow-hidden" style="background: var(--surface-3);">
                  <div class="h-1.5 rounded-full transition-all duration-700 ease-out"
                    style="background: var(--accent);"
                    :style="{ width: `${calculatePercentage(camera.count, stats.cameras[0].count)}%` }">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lenses Section -->
          <div class="rounded-2xl p-6 flex flex-col"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <h2 class="text-base font-semibold mb-5 flex items-center gap-2" style="color: var(--text-1);">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" style="color: var(--accent);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Top Lenses
            </h2>

            <div v-if="!stats?.lenses?.length" class="text-sm text-center py-8" style="color: var(--text-3);">No lens data available</div>

            <div class="space-y-4 flex-1">
              <div v-for="(lens, index) in stats?.lenses?.slice(0, 5)" :key="index">
                <div class="flex justify-between items-end mb-1.5 text-sm">
                  <span class="font-medium" style="color: var(--text-1);">{{ lens.model }}</span>
                  <span style="color: var(--text-3);">{{ lens.count }} shots</span>
                </div>
                <div class="w-full rounded-full h-1.5 overflow-hidden" style="background: var(--surface-3);">
                  <div class="h-1.5 rounded-full transition-all duration-700 ease-out"
                    style="background: var(--accent);"
                    :style="{ width: `${calculatePercentage(lens.count, stats.lenses[0].count)}%` }">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Technical Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            v-for="(type, key) in { aperture: 'Aperture', iso: 'ISO', shutterSpeed: 'Shutter', focalLength: 'Focal Length' }"
            :key="key"
            class="rounded-2xl p-5"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <h3 class="text-sm font-semibold mb-3" style="color: var(--text-1);">{{ type }}</h3>
            <div class="space-y-2">
              <div v-for="(item, idx) in stats?.technical?.[key]" :key="idx" class="flex justify-between text-sm">
                <span style="color: var(--text-2);">{{ item.value || 'Unknown' }}</span>
                <span class="font-semibold" style="color: var(--text-1);">{{ item.count }}</span>
              </div>
              <div v-if="!stats?.technical?.[key]?.length" class="text-xs" style="color: var(--text-3);">No data</div>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="rounded-2xl p-6"
          style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
          <h2 class="text-base font-semibold mb-5" style="color: var(--text-1);">Activity Timeline</h2>
          <div v-if="!timelineData.length" class="text-sm text-center py-10" style="color: var(--text-3);">No timeline data</div>
          <div v-else class="h-64">
            <ClientOnly>
              <Line :data="timelineChartData" :options="timelineChartOptions" />
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

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

const timelineData = computed(() => {
  const raw = stats.value?.timeline
  if (!Array.isArray(raw)) return []

  return raw.map((item: any) => ({
    date: String(item?.date ?? ''),
    count: Number(item?.count ?? 0) || 0,
  }))
})

const formatTimelineLabel = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return value

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const date = new Date(Date.UTC(year, monthIndex, 1))
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const timelineLabels = computed(() => {
  return timelineData.value.map((item) => formatTimelineLabel(item.date))
})

const timelineCounts = computed(() => {
  return timelineData.value.map((item) => item.count)
})

const timelineChartData = computed(() => {
  return {
    labels: timelineLabels.value,
    datasets: [
      {
        label: 'Photos',
        data: timelineCounts.value,
        borderColor: '#0071e3',
        backgroundColor: 'rgba(0, 113, 227, 0.08)',
        pointBackgroundColor: '#0071e3',
        pointBorderColor: '#0071e3',
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.3,
        fill: true,
      },
    ],
  }
})

const timelineChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y} photos`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(60,60,67,0.5)',
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(60,60,67,0.06)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(60,60,67,0.5)',
          precision: 0,
        },
        grid: {
          color: 'rgba(60,60,67,0.08)',
        },
      },
    },
  }
})

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
