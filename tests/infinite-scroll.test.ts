import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushComponent, mountVueFile, nodes } from './helpers/vue-component'

let mounted: ReturnType<typeof mountVueFile> | undefined
afterEach(() => {
    mounted?.app.unmount()
    mounted = undefined
    vi.unstubAllGlobals()
})

describe('scroll loading trigger', () => {
    it('loads near the viewport, re-observes after a page, and disconnects on unmount', async () => {
        let intersect!: (entries: any[]) => void
        const observe = vi.fn()
        const disconnect = vi.fn()
        vi.stubGlobal('IntersectionObserver', class {
            constructor(callback: any, options: any) {
                intersect = callback
                expect(options.rootMargin).toBe('400px')
            }
            observe = observe
            disconnect = disconnect
        })
        const onLoad = vi.fn()
        mounted = mountVueFile('app/components/InfiniteScrollTrigger.vue', {}, { loading: false, hasMore: true, onLoad })
        expect(observe).toHaveBeenCalledTimes(1)
        intersect([{ isIntersecting: false }])
        expect(onLoad).not.toHaveBeenCalled()
        intersect([{ isIntersecting: true }])
        expect(onLoad).toHaveBeenCalledTimes(1)
        mounted.app._instance!.props.loading = true
        await flushComponent()
        intersect([{ isIntersecting: true }])
        expect(onLoad).toHaveBeenCalledTimes(1)
        mounted.app._instance!.props.loading = false
        await flushComponent()
        expect(observe).toHaveBeenCalledTimes(2)
        intersect([{ isIntersecting: true }])
        expect(onLoad).toHaveBeenCalledTimes(2)
        mounted.app._instance!.props.hasMore = false
        await flushComponent()
        intersect([{ isIntersecting: true }])
        expect(onLoad).toHaveBeenCalledTimes(2)
        const disconnectsBeforeUnmount = disconnect.mock.calls.length
        mounted.app.unmount()
        mounted = undefined
        expect(disconnect).toHaveBeenCalledTimes(disconnectsBeforeUnmount + 1)
    })

    it('pauses automatic retries on errors but keeps a manual retry available', () => {
        const observe = vi.fn()
        vi.stubGlobal('IntersectionObserver', class { observe = observe; disconnect() {} })
        const onLoad = vi.fn()
        mounted = mountVueFile('app/components/InfiniteScrollTrigger.vue', {}, {
            loading: false, hasMore: true, error: 'Offline', onLoad,
        })
        expect(observe).not.toHaveBeenCalled()
        nodes(mounted.root).find(el => el.tag === 'button')!.props.onClick()
        expect(onLoad).toHaveBeenCalledTimes(1)
    })
})
