<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Server Status" />

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <!-- Header row -->
            <div class="flex items-center justify-between">
                <h1 class="text-3xl font-bold text-white">Server Status</h1>
                <button @click="refresh" :disabled="loading"
                    class="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {{ loading ? 'Refreshing…' : 'Refresh' }}
                </button>
            </div>

            <!-- Loading skeleton -->
            <template v-if="loading && !status">
                <div v-for="i in 4" :key="i" class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 animate-pulse h-28" />
            </template>

            <template v-else-if="status">
                <!-- Health cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <!-- Database -->
                    <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-sm font-medium text-[var(--text-muted)]">Database</p>
                                <p class="text-xl font-bold mt-1" :class="status.database.ok ? 'text-green-400' : 'text-red-400'">
                                    {{ status.database.ok ? 'Connected' : 'Error' }}
                                </p>
                                <p v-if="status.database.ok" class="text-xs text-[var(--text-muted)] mt-1">
                                    {{ status.database.latencyMs }} ms response
                                </p>
                                <p v-else class="text-xs text-red-300 mt-1 break-all">{{ status.database.error }}</p>
                            </div>
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                :class="status.database.ok ? 'bg-green-500/20' : 'bg-red-500/20'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" :class="status.database.ok ? 'text-green-400' : 'text-red-400'"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3v2c0 1.7-3.6 3-8 3s-8-1.3-8-3V7zm0 5c0 1.7 3.6 3 8 3s8-1.3 8-3m0 0v5c0 1.7-3.6 3-8 3s-8-1.3-8-3v-5" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <!-- Storage -->
                    <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                        <div class="flex items-start justify-between">
                            <div class="min-w-0 pr-3">
                                <p class="text-sm font-medium text-[var(--text-muted)]">Storage</p>
                                <p class="text-xl font-bold mt-1" :class="status.storage.ok ? 'text-green-400' : 'text-red-400'">
                                    {{ status.storage.ok ? 'Writable' : 'Error' }}
                                </p>
                                <p class="text-xs text-[var(--text-muted)] mt-1 truncate" :title="status.storage.path">
                                    {{ status.storage.ok ? status.storage.path : status.storage.error }}
                                </p>
                            </div>
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                :class="status.storage.ok ? 'bg-green-500/20' : 'bg-red-500/20'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" :class="status.storage.ok ? 'text-green-400' : 'text-red-400'"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Quick stats -->
                <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                    <h2 class="text-lg font-semibold text-white mb-4">Overview</h2>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div v-for="stat in statItems" :key="stat.label" class="text-center">
                            <p class="text-3xl font-bold text-white">{{ stat.value }}</p>
                            <p class="text-xs text-[var(--text-muted)] mt-1">{{ stat.label }}</p>
                        </div>
                    </div>
                </div>

                <!-- Migrations -->
                <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-white">Migrations</h2>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300">
                            {{ status.migrations.applied }} applied
                        </span>
                    </div>
                    <div v-if="status.migrations.list.length === 0"
                        class="py-6 text-center text-[var(--text-muted)] text-sm border border-dashed border-white/10 rounded-xl">
                        No migrations tracked yet — server may not have fully booted.
                    </div>
                    <ul v-else class="space-y-2">
                        <li v-for="m in [...status.migrations.list].reverse()" :key="m.name"
                            class="flex items-center justify-between gap-4 py-2.5 px-3 bg-white/5 rounded-lg border border-white/10">
                            <div class="flex items-center gap-2 min-w-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span class="text-sm text-white font-mono truncate">{{ m.name }}</span>
                            </div>
                            <span class="text-xs text-[var(--text-muted)] shrink-0">{{ formatDate(m.appliedAt) }}</span>
                        </li>
                    </ul>
                </div>

            </template>

            <!-- Error state -->
            <div v-else-if="fetchError" class="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-center">
                <p class="text-red-200">{{ fetchError }}</p>
                <button @click="refresh" class="mt-3 text-sm text-red-300 underline">Try again</button>
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

const status = ref<StatusData | null>(null)
const loading = ref(false)
const fetchError = ref<string | null>(null)

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

onMounted(refresh)
</script>
