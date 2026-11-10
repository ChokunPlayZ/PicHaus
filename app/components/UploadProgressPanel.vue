<template>
    <section v-if="visible && queue.length" role="region" aria-label="Upload progress"
        class="fixed left-3 bottom-3 sm:left-6 sm:bottom-6 z-[55] w-[calc(100vw-1.5rem)] sm:w-96 rounded-2xl overflow-hidden"
        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl); margin-bottom: env(safe-area-inset-bottom, 0px);">
        <div class="flex items-center gap-3 px-4 py-3">
            <Icon :name="active ? 'lucide:loader-2' : progress.failed ? 'lucide:circle-alert' : 'lucide:circle-check'"
                class="w-5 h-5 shrink-0" :class="{ 'animate-spin': active }" style="color: var(--accent);" />
            <div class="flex-1 min-w-0" aria-live="polite">
                <h3 class="text-sm font-semibold" style="color: var(--text-1);">{{ heading }}</h3>
                <p class="text-xs" style="color: var(--text-3);">
                    {{ progress.completed }}/{{ progress.total }} finished<span v-if="progress.processing"> · {{ progress.processing }} processing</span><span v-if="progress.failed"> · {{ progress.failed }} failed</span>
                </p>
            </div>
            <button @click="collapsed = !collapsed" class="p-1 rounded-lg" style="color: var(--text-2);"
                :aria-label="collapsed ? 'Expand upload progress' : 'Minimize upload progress'" :aria-expanded="!collapsed">
                <Icon :name="collapsed ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="w-4 h-4" />
            </button>
            <button v-if="!active" @click="dismiss" class="p-1 rounded-lg" style="color: var(--text-3);" aria-label="Dismiss upload progress">
                <Icon name="lucide:x" class="w-4 h-4" />
            </button>
        </div>
        <div class="h-1 overflow-hidden" style="background: var(--surface-3);" role="progressbar"
            aria-label="Overall upload and processing progress" :aria-valuenow="progress.percentage" aria-valuemin="0" aria-valuemax="100"
            :aria-valuetext="`${progress.percentage}%${progress.processing ? ', processing images' : ''}`">
            <div class="h-full transition-all duration-300" style="background: var(--accent);" :style="{ width: `${progress.percentage}%` }"></div>
        </div>
        <template v-if="!collapsed">
            <div class="flex flex-wrap items-center gap-2 px-3 py-2 text-xs" style="border-bottom: 1px solid var(--separator); color: var(--text-2);">
                <label class="flex items-center gap-1.5 mr-auto">Concurrent:
                    <input v-model.number="maxConcurrency" type="number" min="1" max="5" class="w-10 rounded px-1 py-1"
                        style="background: var(--surface-2); color: var(--text-1);" />
                </label>
                <button v-if="retryable" @click="retryFailed" class="px-2 py-1 rounded-lg" style="background: var(--error-bg); color: var(--error-text);">Retry Failed</button>
                <button @click="clearCompleted" class="px-2 py-1 rounded-lg" style="background: var(--surface-3);">Clear Done</button>
            </div>
            <div class="overflow-y-auto p-2 space-y-1" style="max-height: min(16rem, 40vh);">
                <div v-for="item in queue" :key="item.id" class="flex items-start gap-2 rounded-lg p-2" style="background: var(--surface-2);">
                    <Icon :name="item.status === 'completed' ? 'lucide:check' : item.status === 'failed' ? 'lucide:circle-alert' : item.status === 'skipped' ? 'lucide:skip-forward' : 'lucide:loader-2'"
                        class="w-4 h-4 mt-0.5 shrink-0" :class="{ 'animate-spin': !['completed', 'failed', 'skipped'].includes(item.status) }"
                        :style="{ color: item.status === 'failed' ? 'var(--error-text)' : 'var(--accent)' }" />
                    <div class="min-w-0 flex-1">
                        <div class="text-sm truncate" style="color: var(--text-1);" :title="item.file.name">{{ item.file.name }}</div>
                        <NuxtLink :to="`/album/${item.albumId}`" class="block text-xs truncate" style="color: var(--text-3);">{{ item.albumName }}</NuxtLink>
                        <div class="text-xs mt-1" :style="{ color: item.status === 'failed' ? 'var(--error-text)' : 'var(--text-2)' }">
                            <span class="capitalize">{{ item.status }}</span><span v-if="item.status === 'uploading'"> · {{ item.progress }}%</span>
                            <span v-if="item.error"> · {{ item.error }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </section>
</template>

<script setup lang="ts">
const { queue, maxConcurrency, visible, collapsed, active, progress, retryable, retryFailed, clearCompleted, dismiss } = useUploadQueue()
const heading = computed(() => !active.value
    ? progress.value.failed ? 'Uploads finished with errors' : 'Uploads complete'
    : progress.value.processing && queue.value.every(item => ['processing', 'completed', 'skipped', 'failed'].includes(item.status))
        ? 'Processing images…' : 'Uploading photos…')
</script>
