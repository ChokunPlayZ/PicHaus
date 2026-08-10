<template>
  <div class="min-h-screen" style="background: var(--bg-page);">
    <NavBar title="Statistics" />

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
              <Icon name="lucide:image" class="h-6 w-6" style="color: var(--accent);" :stroke-width="2" />
            </div>
            <div>
              <div class="text-xs font-medium mb-0.5" style="color: var(--text-3);">Total Photos</div>
              <div class="text-2xl font-bold" style="color: var(--text-1);">{{ stats?.totals?.photos?.toLocaleString() || 0 }}</div>
            </div>
          </div>
          <div class="rounded-2xl p-5 flex items-center gap-4"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <div class="p-3 rounded-xl" style="background: var(--success-bg);">
              <Icon name="lucide:folder" class="h-6 w-6" style="color: var(--success-text);" :stroke-width="2" />
            </div>
            <div>
              <div class="text-xs font-medium mb-0.5" style="color: var(--text-3);">Total Albums</div>
              <div class="text-2xl font-bold" style="color: var(--text-1);">{{ stats?.totals?.albums?.toLocaleString() || 0 }}</div>
            </div>
          </div>
          <div class="rounded-2xl p-5 flex items-center gap-4"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
            <div class="p-3 rounded-xl" style="background: var(--surface-3);">
              <Icon name="lucide:box" class="h-6 w-6" style="color: var(--text-2);" :stroke-width="2" />
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
              <Icon name="lucide:camera" class="h-5 w-5" style="color: var(--accent);" :stroke-width="2" />
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
              <Icon name="lucide:aperture" class="h-5 w-5" style="color: var(--accent);" :stroke-width="2" />
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

// Chart.js needs resolved colors at runtime; these follow the theme tokens.
const chartAccent = ref('')
const chartTick = ref('')
const chartGrid = ref('')
let chartThemeObserver: MutationObserver | null = null

const resolveChartTheme = () => {
  if (!process.client) return
  const styles = getComputedStyle(document.documentElement)
  chartAccent.value = styles.getPropertyValue('--accent').trim()
  chartTick.value = styles.getPropertyValue('--text-3').trim()
  chartGrid.value = styles.getPropertyValue('--separator').trim()
}

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.trim().replace(/^#/, '')
  if (clean.length !== 6) return hex
  const int = parseInt(clean, 16)
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`
}

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
        borderColor: chartAccent.value,
        backgroundColor: hexToRgba(chartAccent.value, 0.08),
        pointBackgroundColor: chartAccent.value,
        pointBorderColor: chartAccent.value,
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
          color: chartTick.value,
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: chartGrid.value,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: chartTick.value,
          precision: 0,
        },
        grid: {
          color: chartGrid.value,
        },
      },
    },
  }
})

onMounted(async () => {
  resolveChartTheme()
  chartThemeObserver = new MutationObserver(resolveChartTheme)
  chartThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
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

onUnmounted(() => {
  chartThemeObserver?.disconnect()
  chartThemeObserver = null
})
</script>
