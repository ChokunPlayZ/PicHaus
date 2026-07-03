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
