<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Server Status" />

        <div class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <!-- Header row -->
            <div class="flex items-center justify-between">
                <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">Server Status</h1>
                <button @click="refresh" :disabled="loading"
                    class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
                    style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                    @mouseover="!loading && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                    <Icon name="lucide:refresh-cw" class="w-4 h-4" :class="{ 'animate-spin': loading }" :stroke-width="2" />
                    {{ loading ? 'Refreshing…' : 'Refresh' }}
                </button>
            </div>

            <!-- Loading skeleton -->
            <template v-if="loading && !status">
                <div v-for="i in 4" :key="i" class="rounded-2xl p-6 animate-pulse h-28"
                    style="background: var(--surface-1); border: 1px solid var(--separator);" />
            </template>

            <template v-else-if="status">
                <!-- Health cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Database -->
                    <div class="rounded-2xl p-6"
                        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Database</p>
                                <p class="text-xl font-bold mt-1"
                                    :style="status.database.ok ? 'color: var(--success-text)' : 'color: var(--error)'">
                                    {{ status.database.ok ? 'Connected' : 'Error' }}
                                </p>
                                <p v-if="status.database.ok" class="text-xs mt-1" style="color: var(--text-3);">
                                    {{ status.database.latencyMs }} ms response
                                </p>
                                <p v-else class="text-xs mt-1 break-all" style="color: var(--error);">{{ status.database.error }}</p>
                            </div>
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                :style="status.database.ok ? 'background: var(--success-bg)' : 'background: var(--error-bg)'">
                                <Icon name="lucide:database" class="w-5 h-5" :style="status.database.ok ? 'color: var(--success-text)' : 'color: var(--error)'" :stroke-width="2" />
                            </div>
                        </div>
                    </div>

                    <!-- Storage -->
                    <div class="rounded-2xl p-6"
                        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                        <div class="flex items-start justify-between">
                            <div class="min-w-0 pr-3">
                                <p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Storage</p>
                                <p class="text-xl font-bold mt-1"
                                    :style="status.storage.ok ? 'color: var(--success-text)' : 'color: var(--error)'">
                                    {{ status.storage.ok ? 'Writable' : 'Error' }}
                                </p>
                                <p class="text-xs mt-1 truncate" :title="status.storage.path" style="color: var(--text-3);">
                                    {{ status.storage.ok ? status.storage.path : status.storage.error }}
                                </p>
                            </div>
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                :style="status.storage.ok ? 'background: var(--success-bg)' : 'background: var(--error-bg)'">
                                <Icon name="lucide:hard-drive" class="w-5 h-5" :style="status.storage.ok ? 'color: var(--success-text)' : 'color: var(--error)'" :stroke-width="2" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick stats -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-base font-semibold mb-4" style="color: var(--text-1);">Overview</h2>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div v-for="stat in statItems" :key="stat.label" class="text-center">
                            <p class="text-3xl font-bold" style="color: var(--text-1);">{{ stat.value }}</p>
                            <p class="text-xs mt-1" style="color: var(--text-3);">{{ stat.label }}</p>
                        </div>
                    </div>
                </div>

                <!-- Migrations -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold" style="color: var(--text-1);">Migrations</h2>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full"
                            style="background: var(--success-bg); color: var(--success-text);">
                            {{ status.migrations.applied }} applied
                        </span>
                    </div>
                    <div v-if="status.migrations.list.length === 0"
                        class="py-6 text-center text-sm rounded-xl"
                        style="color: var(--text-3); border: 1px dashed var(--separator);">
                        No migrations tracked yet — server may not have fully booted.
                    </div>
                    <ul v-else class="space-y-2">
                        <li v-for="m in [...status.migrations.list].reverse()" :key="m.name"
                            class="flex items-center justify-between gap-4 py-2.5 px-3 rounded-xl"
                            style="background: var(--surface-2); border: 1px solid var(--separator);">
                            <div class="flex items-center gap-2 min-w-0">
                                <Icon name="lucide:check" class="w-4 h-4 shrink-0" style="color: var(--success-text);" :stroke-width="2" />
                                <span class="text-sm font-mono truncate" style="color: var(--text-1);">{{ m.name }}</span>
                            </div>
                            <span class="text-xs shrink-0" style="color: var(--text-3);">{{ formatDate(m.appliedAt) }}</span>
                        </li>
                    </ul>
                </div>

                <!-- Job Queue -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <div class="flex items-center justify-between gap-4 mb-4">
                        <h2 class="text-base font-semibold" style="color: var(--text-1);">Job Queue</h2>
                        <span class="text-xs shrink-0" style="color: var(--text-3);">Auto-refreshes every 5 seconds</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--separator); background: var(--surface-2);">
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Job Type</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Pending</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Running</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Failed</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="queueLoading && !queueStatus">
                                    <td colspan="5" class="px-4 py-8 text-center text-sm animate-pulse" style="color: var(--text-3);">Loading queue…</td>
                                </tr>
                                <tr v-for="job in jobTypes" :key="job.key"
                                    style="border-top: 1px solid var(--separator);">
                                    <td class="px-4 py-3 text-sm font-medium" style="color: var(--text-1);">{{ job.label }}</td>
                                    <td class="px-4 py-3 text-sm text-right" style="color: var(--text-2);">{{ queueCount(job.key, 'pending') }}</td>
                                    <td class="px-4 py-3 text-sm text-right" style="color: var(--text-2);">{{ queueCount(job.key, 'running') }}</td>
                                    <td class="px-4 py-3 text-sm text-right" :style="queueCount(job.key, 'failed') > 0 ? 'color: var(--error-text);' : 'color: var(--text-2);'">{{ queueCount(job.key, 'failed') }}</td>
                                    <td class="px-4 py-3 text-sm text-right" style="color: var(--success-text);">{{ queueCount(job.key, 'completed') }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p v-if="queueError" class="mt-3 text-xs" style="color: var(--error-text);">{{ queueError }}</p>
                </div>

                <!-- Failed Jobs -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <div class="flex items-center justify-between gap-4 mb-4">
                        <h2 class="text-base font-semibold" style="color: var(--text-1);">Failed Jobs</h2>
                        <div class="flex items-center gap-3">
                            <span v-if="failedJobs.length > 0" class="text-xs shrink-0" style="color: var(--text-3);">Last {{ failedJobs.length }} failures</span>
                            <button v-if="failedJobs.length > 0" @click="retryAllFailedJobs"
                                :disabled="retryingAllFailed"
                                class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                                style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                                title="Retry all failed jobs">
                                <Icon :name="retryingAllFailed ? 'lucide:loader-2' : 'lucide:rotate-ccw'"
                                    class="w-4 h-4" :class="{ 'animate-spin': retryingAllFailed }" :stroke-width="2" />
                                Retry all
                            </button>
                        </div>
                    </div>
                    <div v-if="failedJobs.length === 0" class="py-6 text-center text-sm rounded-xl"
                        style="color: var(--text-3); border: 1px dashed var(--separator);">
                        No failed jobs.
                    </div>
                    <div v-else class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--separator); background: var(--surface-2);">
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Type</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Error</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Attempts</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Updated</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="job in failedJobs" :key="job.id"
                                    style="border-top: 1px solid var(--separator);">
                                    <td class="px-4 py-3 text-sm font-medium whitespace-nowrap" style="color: var(--text-1);">{{ job.type }}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="block max-w-[360px] truncate font-mono" :title="job.error"
                                            style="color: var(--error-text);">{{ job.error }}</span>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-right" style="color: var(--text-2);">{{ job.attempts }}</td>
                                    <td class="px-4 py-3 text-sm text-right whitespace-nowrap" style="color: var(--text-3);">{{ formatJobDate(job.updatedAt) }}</td>
                                    <td class="px-4 py-3 text-right whitespace-nowrap">
                                        <button @click="retryFailedJob(job.id)" :disabled="retryingJobId === job.id"
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-50"
                                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                                            title="Retry this job">
                                            <Icon :name="retryingJobId === job.id ? 'lucide:loader-2' : 'lucide:rotate-ccw'"
                                                class="w-3.5 h-3.5" :class="{ 'animate-spin': retryingJobId === job.id }" :stroke-width="2" />
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Reprocess Library -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-base font-semibold mb-1" style="color: var(--text-1);">Reprocess Library</h2>
                    <p class="text-sm mb-4" style="color: var(--text-3);">
                        Re-enqueue background processing for photos in the library.
                    </p>
                    <div class="flex flex-wrap gap-3">
                        <button v-for="action in reprocessActions" :key="action.scope" @click="reprocess(action.scope)"
                            :disabled="reprocessing !== null"
                            class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                            @mouseover="reprocessing === null && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                            <Icon v-if="reprocessing === action.scope" name="lucide:loader-2"
                                class="w-4 h-4 animate-spin" :stroke-width="2" />
                            <Icon v-else :name="action.icon" class="w-4 h-4" :stroke-width="2" />
                            {{ action.label }}
                        </button>
                    </div>
                </div>
            </template>

            <!-- Error state -->
            <div v-else-if="fetchError" class="rounded-2xl p-6 text-center"
                style="background: var(--error-bg); border: 1px solid var(--error-border);">
                <p class="text-sm" style="color: var(--error-text);">{{ fetchError }}</p>
                <button @click="refresh" class="mt-3 text-sm underline" style="color: var(--error);">Try again</button>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface StatusData {
    database: { ok: boolean; latencyMs: number; error: string | null }
    storage: { ok: boolean; path: string; error: string | null }
    migrations: { applied: number; list: { name: string; appliedAt: number }[] }
    stats: { users: number; albums: number; photos: number; storageMb: number }
}

interface QueueCounts {
    pending: number
    running: number
    failed: number
    completed: number
}

interface FailedJob {
    id: string
    type: string
    error: string
    attempts: number
    updatedAt: number | string
}

interface QueueStatus {
    byType: Record<string, Partial<QueueCounts>>
    failedJobs: FailedJob[]
}

const { confirm, toast } = useDialog()

const status = ref<StatusData | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)
const queueStatus = ref<QueueStatus | null>(null)
const queueLoading = ref(false)
const queueError = ref<string | null>(null)
const reprocessing = ref<string | null>(null)
const retryingJobId = ref<string | null>(null)
const retryingAllFailed = ref(false)
let queueTimer: ReturnType<typeof setInterval> | null = null

const jobTypes = [
    { key: 'metadata', label: 'Metadata' },
    { key: 'thumbnail', label: 'Thumbnails' },
    { key: 'face-detection', label: 'Face Detection' },
]

type ReprocessScope = 'faces' | 'thumbnails' | 'metadata'

const reprocessActions: Array<{ scope: ReprocessScope; label: string; icon: string }> = [
    { scope: 'metadata', label: 'Reprocess Metadata', icon: 'lucide:file-pen' },
    { scope: 'thumbnails', label: 'Reprocess Thumbnails', icon: 'lucide:image' },
    { scope: 'faces', label: 'Reprocess Faces', icon: 'lucide:scan-face' },
]

const failedJobs = computed(() => queueStatus.value?.failedJobs?.slice(0, 20) || [])

function queueCount(type: string, key: keyof QueueCounts): number {
    return queueStatus.value?.byType?.[type]?.[key] ?? 0
}

const statItems = computed(() => status.value ? [
    { label: 'Users', value: status.value.stats.users.toLocaleString() },
    { label: 'Albums', value: status.value.stats.albums.toLocaleString() },
    { label: 'Photos', value: status.value.stats.photos.toLocaleString() },
    { label: 'Storage', value: `${status.value.stats.storageMb} MB` },
] : [])

async function refresh() {
    loading.value = true
    fetchError.value = null
    try {
        const res = await $fetch<{ success: boolean; data: StatusData }>('/api/v1/admin/status')
        status.value = res.data
    } catch (err: any) {
        fetchError.value = err?.data?.statusMessage ?? 'Failed to fetch server status'
    } finally {
        loading.value = false
    }
}

function formatDate(ts: number): string {
    if (!ts) return '—'
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatJobDate(value: number | string): string {
    if (!value) return '—'
    const ts = typeof value === 'number' && value < 1e12 ? value * 1000 : value
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

async function refreshQueue() {
    queueLoading.value = true
    queueError.value = null
    try {
        const res = await $fetch<{
            success: boolean
            data: {
                stats: { byType: Record<string, Partial<QueueCounts>> }
                recentFailed: FailedJob[]
            }
        }>('/api/v1/admin/queue-status')
        queueStatus.value = { byType: res.data.stats.byType, failedJobs: res.data.recentFailed }
    } catch (err: any) {
        queueError.value = err?.data?.statusMessage ?? 'Failed to load job queue'
    } finally {
        queueLoading.value = false
    }
}

async function reprocess(scope: ReprocessScope) {
    const action = reprocessActions.find(a => a.scope === scope)
    const ok = await confirm(
        `${action?.label || 'Reprocess'} will re-enqueue background jobs for the library. Continue?`,
        { title: action?.label || 'Reprocess Library' }
    )
    if (!ok) return

    reprocessing.value = scope
    try {
        const res = await $fetch<{ enqueued: number }>('/api/v1/admin/reprocess', {
            method: 'POST',
            body: { scope }
        })
        const count = res?.enqueued ?? 0
        toast(`${count} job${count === 1 ? '' : 's'} enqueued`, 'success')
        await refreshQueue()
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to enqueue reprocessing jobs', 'error')
    } finally {
        reprocessing.value = null
    }
}

async function retryFailedJob(jobId: string) {
    retryingJobId.value = jobId
    try {
        const res = await $fetch<{ retried: number }>('/api/v1/admin/queue/retry', {
            method: 'POST',
            body: { jobIds: [jobId] }
        })
        const count = res?.retried ?? 0
        toast(`Retried ${count} job${count === 1 ? '' : 's'}`, 'success')
        await refreshQueue()
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to retry job', 'error')
    } finally {
        retryingJobId.value = null
    }
}

async function retryAllFailedJobs() {
    const ok = await confirm('Retry all failed jobs?', { title: 'Retry Failed Jobs' })
    if (!ok) return

    retryingAllFailed.value = true
    try {
        const res = await $fetch<{ retried: number }>('/api/v1/admin/queue/retry', {
            method: 'POST',
            body: {}
        })
        const count = res?.retried ?? 0
        toast(`Retried ${count} failed job${count === 1 ? '' : 's'}`, 'success')
        await refreshQueue()
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to retry failed jobs', 'error')
    } finally {
        retryingAllFailed.value = false
    }
}

onMounted(() => {
    refresh()
    refreshQueue()
    queueTimer = setInterval(() => { refreshQueue() }, 5000)
})

onUnmounted(() => {
    if (queueTimer) {
        clearInterval(queueTimer)
        queueTimer = null
    }
})
</script>
