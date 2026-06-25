import { JustifiedLayout } from '@immich/justified-layout-wasm'

interface PhotoDimensions {
    width?: number | null
    height?: number | null
}

export function useJustifiedLayout(photos: Ref<PhotoDimensions[]>) {
    const containerRef = ref<HTMLElement | null>(null)
    const containerWidth = ref(typeof window !== 'undefined' ? window.innerWidth - 32 : 1200)

    const picturesLayout = computed(() => {
        if (!photos.value.length) return null

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
        const aspectRatios = new Float32Array(
            photos.value.map(p => (p.width || 1) / (p.height || 1))
        )

        return new JustifiedLayout(aspectRatios, {
            rowHeight: isMobile ? 120 : 180,
            rowWidth: containerWidth.value,
            spacing: isMobile ? 8 : 12,
            heightTolerance: 0.1,
        })
    })

    let resizeObserver: ResizeObserver | null = null

    watch(containerRef, (el) => {
        resizeObserver?.disconnect()
        resizeObserver = null
        if (el) {
            resizeObserver = new ResizeObserver(entries => {
                const width = entries[0]?.contentRect.width
                if (width && width > 0) containerWidth.value = width
            })
            resizeObserver.observe(el)
        }
    })

    onUnmounted(() => resizeObserver?.disconnect())

    return { containerRef, picturesLayout }
}
