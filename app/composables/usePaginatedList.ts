import { onScopeDispose, ref, shallowRef } from 'vue'
import type { Pagination } from '../types/people'

export function usePaginatedList<T extends { id: string }>(
    fetchPage: (page: number, signal: AbortSignal) => Promise<{ items: T[]; pagination: Pagination }>,
    errorMessage: string,
) {
    const items = shallowRef<T[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const total = ref(0)
    const hasMore = ref(false)
    let page = 0
    let controller: AbortController | null = null

    async function load(reset = false) {
        if (!reset && (loading.value || (!hasMore.value && !error.value))) return
        controller?.abort()
        const request = new AbortController()
        controller = request
        if (reset) {
            page = 0
            items.value = []
            total.value = 0
            hasMore.value = false
        }
        loading.value = true
        error.value = null
        try {
            const result = await fetchPage(page + 1, request.signal)
            if (request.signal.aborted) return
            const existing = new Set(items.value.map(item => item.id))
            items.value = [...items.value, ...result.items.filter(item => !existing.has(item.id))]
            page = result.pagination.page
            total.value = result.pagination.total
            hasMore.value = result.pagination.hasMore
        } catch (err: any) {
            if (!request.signal.aborted) error.value = err?.data?.statusMessage || errorMessage
        } finally {
            if (controller === request) {
                controller = null
                loading.value = false
            }
        }
    }

    onScopeDispose(() => controller?.abort())

    return { items, loading, error, total, hasMore, refresh: () => load(true), loadMore: () => load() }
}
