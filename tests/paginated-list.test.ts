import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { usePaginatedList } from '../app/composables/usePaginatedList'

const scopes: ReturnType<typeof effectScope>[] = []
function createList(fetchPage: any) {
    const scope = effectScope()
    scopes.push(scope)
    return scope.run(() => usePaginatedList<{ id: string }>(fetchPage, 'Could not load'))!
}
function page(ids: string[], page = 1, hasMore = true) {
    return { items: ids.map(id => ({ id })), pagination: { page, limit: 2, total: 3, hasMore } }
}
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()))

describe('infinite list loading', () => {
    it('appends pages without duplicates and stops at the last page', async () => {
        const fetchPage = vi.fn().mockResolvedValueOnce(page(['a', 'b'])).mockResolvedValueOnce(page(['b', 'c'], 2, false))
        const list = createList(fetchPage)
        await list.refresh()
        await list.loadMore()
        await list.loadMore()
        expect(list.items.value.map(item => item.id)).toEqual(['a', 'b', 'c'])
        expect(list.total.value).toBe(3)
        expect(list.hasMore.value).toBe(false)
        expect(fetchPage.mock.calls.map(args => args[0])).toEqual([1, 2])
    })

    it('keeps entries on a failed next page and retries the same page', async () => {
        const fetchPage = vi.fn().mockResolvedValueOnce(page(['a', 'b']))
            .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(['c'], 2, false))
        const list = createList(fetchPage)
        await list.refresh()
        await list.loadMore()
        expect(list.items.value).toHaveLength(2)
        expect(list.error.value).toBe('Could not load')
        await list.loadMore()
        expect(list.items.value).toHaveLength(3)
        expect(list.error.value).toBeNull()
        expect(fetchPage.mock.calls.map(args => args[0])).toEqual([1, 2, 2])
    })

    it('can retry an initial failure', async () => {
        const fetchPage = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(['a']))
        const list = createList(fetchPage)
        await list.refresh()
        await list.loadMore()
        expect(list.items.value).toEqual([{ id: 'a' }])
        expect(fetchPage.mock.calls.map(args => args[0])).toEqual([1, 1])
    })

    it('ignores stale requests after refresh and prevents concurrent scroll loads', async () => {
        let finishFirst!: (value: any) => void
        const fetchPage = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
            .mockResolvedValueOnce(page(['new'], 1, false))
        const list = createList(fetchPage)
        const first = list.refresh()
        await list.loadMore()
        expect(fetchPage).toHaveBeenCalledTimes(1)
        await list.refresh()
        expect(fetchPage.mock.calls[0]![1].aborted).toBe(true)
        finishFirst(page(['old']))
        await first
        expect(list.items.value).toEqual([{ id: 'new' }])
        expect(list.loading.value).toBe(false)
    })

    it('aborts pending requests on disposal', () => {
        const fetchPage = vi.fn(() => new Promise<any>(() => {}))
        const list = createList(fetchPage)
        list.refresh()
        scopes[0]!.stop()
        expect(fetchPage.mock.calls[0]![1].aborted).toBe(true)
    })
})
