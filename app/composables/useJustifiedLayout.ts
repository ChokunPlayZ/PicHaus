import justifiedLayout from 'justified-layout'

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
        const layout = justifiedLayout(
            photos.value.map(p => (p.width || 1) / (p.height || 1)),
            {
                targetRowHeight: isMobile ? 120 : 180,
                containerWidth: containerWidth.value,
                boxSpacing: isMobile ? 8 : 12,
                containerPadding: 0,
                targetRowHeightTolerance: 0.1,
            },
        )

        return {
            containerHeight: layout.containerHeight,
            getPosition(index: number) {
                const box = layout.boxes[index]
                return box
                    ? { top: box.top, left: box.left, width: box.width, height: box.height }
                    : { top: 0, left: 0, width: 0, height: 0 }
            },
        }
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
