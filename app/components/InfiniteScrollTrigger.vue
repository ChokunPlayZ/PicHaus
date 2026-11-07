<template>
    <div ref="sentinel" class="flex flex-col items-center justify-center gap-2 py-6 min-h-16" aria-live="polite">
        <template v-if="loading">
            <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin" style="color: var(--accent);" />
            <span class="text-sm" style="color: var(--text-3);">Loading…</span>
        </template>
        <template v-else-if="error">
            <p class="text-sm text-center" style="color: var(--error-text);">{{ error }}</p>
            <button @click="$emit('load')" class="text-sm underline" style="color: var(--text-link);">Try again</button>
        </template>
        <button v-else-if="hasMore" @click="$emit('load')" class="text-sm" style="color: var(--text-link);">Load more</button>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ loading: boolean; hasMore: boolean; error?: string | null }>()
const emit = defineEmits<{ load: [] }>()
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function observe() {
    observer?.disconnect()
    if (!props.loading && props.hasMore && !props.error && sentinel.value) observer?.observe(sentinel.value)
}

onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !props.loading && props.hasMore && !props.error) emit('load')
    }, { rootMargin: '400px' })
    observe()
})

// Re-observe after each page so short pages keep filling the viewport.
watch(() => [props.loading, props.hasMore, props.error], observe, { flush: 'post' })
onUnmounted(() => observer?.disconnect())
</script>
