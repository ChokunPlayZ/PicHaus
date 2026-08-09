<template>
    <div class="timeline-page" style="background: var(--bg-page);">
        <NavBar title="Timeline" :solid="true" />

        <div class="timeline-layout">
            <!-- Main scrollable content -->
            <div class="timeline-content" ref="scrollContainer" @scroll.passive="onScroll">
                <!-- Loading skeleton -->
                <div v-if="loadingMonths" class="flex justify-center py-20">
                    <div class="w-10 h-10 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>

                <!-- Empty state -->
                <div v-else-if="months.length === 0"
                    class="text-center py-32 mx-4">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
                        style="background: var(--surface-1); border: 1px solid var(--separator);">
                        <Icon name="lucide:camera" class="w-10 h-10" style="color: var(--text-3);" :stroke-width="1.5" />
                    </div>
                    <h3 class="text-2xl font-bold mb-3" style="color: var(--text-1);">No photos yet</h3>
                    <p class="text-sm" style="color: var(--text-2);">Upload your first photo to start your timeline.</p>
                </div>

                <!-- Timeline month groups -->
                <div v-else ref="gridContainerRef" class="px-4 sm:px-6 lg:px-8 py-8 pr-20">
                    <div
                        v-for="month in months"
                        :key="month.key"
                        :ref="el => setMonthSectionRef(month.key, el as HTMLElement | null)"
                        class="timeline-month-section mb-12"
                    >
                        <template v-if="isMonthLoaded(month.key)">
                            <MonthHeader :label="month.label" :count="month.count" />

                            <!-- Loading state for this month's photos -->
                            <div v-if="loadedMonths.get(month.key)!.loading" class="flex justify-center py-12">
                                <div class="flex items-center gap-3 text-sm" style="color: var(--text-3);">
                                    <div class="w-5 h-5 border-2 rounded-full animate-spin"
                                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                                    Loading photos…
                                </div>
                            </div>

                            <!-- Error state -->
                            <div v-else-if="loadedMonths.get(month.key)!.error" class="py-6 text-center rounded-2xl px-4"
                                style="background: var(--error-bg); border: 1px solid var(--error-border);">
                                <p class="text-sm mb-3" style="color: var(--error-text);">{{ loadedMonths.get(month.key)!.error }}</p>
                                <button @click="loadMonthPhotos(month.key)"
                                    class="text-xs px-4 py-1.5 rounded-full"
                                    style="background: var(--accent); color: var(--accent-text);">
                                    Retry
                                </button>
                            </div>

                            <!-- Justified layout grid -->
                            <div v-else-if="loadedMonths.get(month.key)!.photos.length > 0 && loadedMonths.get(month.key)!.layout"
                                class="relative w-full"
                                :style="{ height: `${loadedMonths.get(month.key)!.layout!.containerHeight}px` }">
                                <PhotoTile
                                    v-for="(photo, idx) in loadedMonths.get(month.key)!.photos"
                                    :key="photo.id"
                                    :photo="photo"
                                    :position="loadedMonths.get(month.key)!.layout!.getPosition(idx)"
                                    :show-hover-info="true"
                                    :show-action-menu="true"
                                    @click="openViewer(month.key, idx)"
                                    @contextmenu="openContextMenu($event, photo)"
                                    @action-menu="openContextMenu($event, photo)"
                                />
                            </div>

                            <!-- Per-month sentinel: triggers next-page load when scrolled into view -->
                            <div v-if="loadedMonths.get(month.key)!.hasMore"
                                :ref="el => setMonthSentinelRef(month.key, el as HTMLElement | null)"
                                class="h-16 flex items-center justify-center">
                                <div v-if="loadedMonths.get(month.key)!.loadingMore" class="flex items-center gap-2 text-xs" style="color: var(--text-3);">
                                    <div class="w-4 h-4 border-2 rounded-full animate-spin"
                                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                                    Loading more…
                                </div>
                            </div>
                        </template>

                        <!-- Unloaded month: lightweight placeholder with estimated height -->
                        <template v-else>
                            <MonthHeader :label="month.label" :count="month.count" />
                            <div class="timeline-skeleton" :style="{ height: `${estimateMonthHeight(month)}px` }">
                                <div class="timeline-skeleton-row">
                                    <div class="timeline-skeleton-block"></div>
                                    <div class="timeline-skeleton-block"></div>
                                    <div class="timeline-skeleton-block"></div>
                                </div>
                                <div class="timeline-skeleton-row">
                                    <div class="timeline-skeleton-block"></div>
                                    <div class="timeline-skeleton-block"></div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Timeline scrollbar — right side -->
            <div
                v-if="months.length > 0"
                class="timeline-scrollbar"
                @mouseleave="hoverMonthKey = null"
            >
                <div class="scrollbar-inner">
                    <template v-for="(group, gi) in yearGroups" :key="group.year">
                        <!-- Year label -->
                        <div class="scrollbar-year-label" :class="{ 'mt-0': gi === 0 }">
                            {{ group.year }}
                        </div>
                        <!-- Month ticks -->
                        <button
                            v-for="m in group.months"
                            :key="m.key"
                            class="scrollbar-month-tick"
                            :class="{
                                'scrollbar-month-active': activeMonthKey === m.key,
                                'scrollbar-month-hovered': hoverMonthKey === m.key,
                            }"
                            @click="jumpToMonth(m.key)"
                            @mouseenter="hoverMonthKey = m.key"
                            :title="m.label"
                        >
                            <span class="tick-label">{{ m.shortLabel }}</span>
                            <span class="tick-dot"></span>
                        </button>
                    </template>
                </div>

                <!-- Hover tooltip -->
                <Transition name="tooltip">
                    <div v-if="hoverMonthKey"
                        class="scrollbar-tooltip">
                        {{ months.find(m => m.key === hoverMonthKey)?.label }}
                        <span class="tooltip-count">
                            {{ months.find(m => m.key === hoverMonthKey)?.count }} photos
                        </span>
                    </div>
                </Transition>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer
            v-if="viewerOpen && selectedPhoto"
            :photo="selectedPhoto"
            :has-previous="viewerFlatIndex > 0"
            :has-next="viewerFlatIndex < flatPhotos.length - 1"
            :previous-photo-id="viewerFlatIndex > 0 ? flatPhotos[viewerFlatIndex - 1]?.id || null : null"
            :next-photo-id="viewerFlatIndex < flatPhotos.length - 1 ? flatPhotos[viewerFlatIndex + 1]?.id || null : null"
            :previous-photo-timestamp="viewerFlatIndex > 0 ? (flatPhotos[viewerFlatIndex - 1]?.dateTaken || flatPhotos[viewerFlatIndex - 1]?.createdAt || null) : null"
            :next-photo-timestamp="viewerFlatIndex < flatPhotos.length - 1 ? (flatPhotos[viewerFlatIndex + 1]?.dateTaken || flatPhotos[viewerFlatIndex + 1]?.createdAt || null) : null"
            @close="viewerOpen = false"
            @previous="navigateViewer(-1)"
            @next="navigateViewer(1)"
        />

        <!-- Context Menu -->
        <PhotoContextMenu
            :photo="ctxPhoto"
            :visible="ctxVisible"
            :x="ctxX"
            :y="ctxY"
            @close="ctxVisible = false"
            @view="onCtxView"
            @download="onCtxDownload"
            @share="onCtxShare"
            @go-to-album="onCtxGoToAlbum"
            @edit="onCtxEdit"
            @delete="onCtxDelete"
        />

        <!-- Edit Modal -->
        <EditPhotoModal
            v-model="editModalOpen"
            :photo="ctxPhoto"
            @saved="onPhotoSaved"
        />
    </div>
</template>

<script setup lang="ts">
import justifiedLayout from 'justified-layout'

interface Photo {
    id: string
    filename: string
    originalName: string
    size: number
    width?: number | null
    height?: number | null
    blurhash?: string | null
    dateTaken?: number | null
    createdAt: number
    updatedAt?: number | null
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
    albumId?: string | null
    uploader: {
        name: string | null
        instagram?: string | null
        avatar?: string | null
    } | null
}

interface MonthMeta {
    key: string
    label: string
    shortLabel: string
    count: number
    earliestTs: number
}

interface MonthData extends MonthMeta {
    photos: Photo[]
    layout: { containerHeight: number; getPosition: (i: number) => { top: number; left: number; width: number; height: number } } | null
    loading: boolean
    loadingMore: boolean
    error: string
    hasMore: boolean
    page: number
}

// Shape emitted by EditPhotoModal's `saved` event.
interface SavedPhoto {
    id: string
    originalName?: string
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
    dateTaken?: number | null
}

// Shared header markup so a placeholder and a loaded month never jump visually.
const MonthHeader = defineComponent({
    props: {
        label: { type: String, required: true },
        count: { type: Number, required: true },
    },
    setup(props) {
        return () => h(
            'div',
            { class: 'flex items-center gap-4 mb-5 sticky top-0 z-10 py-2', style: { background: 'var(--bg-page)' } },
            [
                h('div', { class: 'flex items-center gap-3' }, [
                    h('div', { class: 'w-1 h-8 rounded-full', style: { background: 'var(--accent)' } }),
                    h('div', null, [
                        h('h2', { class: 'text-xl font-bold tracking-tight', style: { color: 'var(--text-1)' } }, props.label),
                        h('p', { class: 'text-xs mt-0.5', style: { color: 'var(--text-3)' } }, `${props.count} ${props.count === 1 ? 'photo' : 'photos'}`),
                    ]),
                ]),
                h('div', { class: 'flex-1 h-px', style: { background: 'var(--separator)' } }),
            ],
        )
    },
})

// ── Layout helpers ─────────────────────────────────────────────────────────
const scrollContainer = ref<HTMLElement | null>(null)
// containerWidth is measured from the actual grid wrapper via ResizeObserver
const containerWidth = ref(800)
const gridContainerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function buildLayout(photosArr: Photo[]) {
    if (!photosArr.length) return null
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const layout = justifiedLayout(
        photosArr.map(p => (p.width || 1) / (p.height || 1)),
        {
            targetRowHeight: isMobile ? 120 : 190,
            containerWidth: containerWidth.value,
            boxSpacing: isMobile ? 8 : 12,
            containerPadding: 0,
            targetRowHeightTolerance: 0.1,
        }
    )
    return {
        containerHeight: layout.containerHeight,
        getPosition(index: number) {
            const box = layout.boxes[index]
            return box
                ? { top: box.top, left: box.left, width: box.width, height: box.height }
                : { top: 0, left: 0, width: 0, height: 0 }
        }
    }
}

// Rough height for an unloaded month so the page can lay out the full timeline.
// Assumes justified rows near the same rowHeight/spacing as buildLayout(), with
// photos averaging ~3:2, plus ~80px of header space.
function estimateMonthHeight(month: MonthMeta): number {
    const known = knownHeights[month.key]
    if (known) return known
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const rowHeight = isMobile ? 120 : 190
    const spacing = isMobile ? 8 : 12
    const photosPerRow = Math.max(1, Math.floor(containerWidth.value / (rowHeight * 1.5 + spacing)))
    const rows = Math.ceil(month.count / photosPerRow)
    return rows * (rowHeight + spacing) + 80
}

function setupResizeObserver() {
    resizeObserver?.disconnect()
    if (!gridContainerRef.value) return
    resizeObserver = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width
        if (w && w > 0 && w !== containerWidth.value) {
            containerWidth.value = w
            // Width changed: recompute estimates for never-measured placeholders.
            for (const key of Object.keys(knownHeights)) {
                if (!loadedMonths.value.has(key)) delete knownHeights[key]
            }
            // Rebuild all layouts with new width
            for (const [, m] of loadedMonths.value) {
                if (m.photos.length) m.layout = buildLayout(m.photos)
            }
        }
    })
    resizeObserver.observe(gridContainerRef.value)
}

// ── Data ───────────────────────────────────────────────────────────────────
const loadingMonths = ref(true)
const months = ref<MonthMeta[]>([])
// Months that have been fetched, keyed by month key. Render order always comes
// from `months`; this map only stores the data for the loaded subset.
const loadedMonths = ref<Map<string, MonthData>>(new Map())
// Real measured section heights for months that were loaded at least once, so
// unloading and re-loading keeps the scroll position stable.
const knownHeights: Record<string, number> = {}

function isMonthLoaded(key: string): boolean {
    return loadedMonths.value.has(key)
}

// ── Scrollbar ──────────────────────────────────────────────────────────────
const activeMonthKey = ref<string | null>(null)
const hoverMonthKey = ref<string | null>(null)
const monthRefs = ref<Record<string, HTMLElement>>({})
const placeholderRefs = ref<Record<string, HTMLElement>>({})
const monthSentinelRefs = ref<Record<string, HTMLElement>>({})
let placeholderObserver: IntersectionObserver | null = null
let unloadObserver: IntersectionObserver | null = null
let sentinelObserver: IntersectionObserver | null = null

// Every rendered section (loaded or placeholder) is tracked here so the active
// month observer and the unload observer always see the whole timeline.
function setMonthSectionRef(key: string, el: HTMLElement | null) {
    if (el) {
        monthRefs.value[key] = el
        el.dataset.monthKey = key
        if (unloadObserver) unloadObserver.observe(el)
        if (!isMonthLoaded(key)) {
            placeholderRefs.value[key] = el
            if (placeholderObserver) placeholderObserver.observe(el)
        } else {
            delete placeholderRefs.value[key]
        }
    } else {
        const old = monthRefs.value[key]
        if (old && unloadObserver) unloadObserver.unobserve(old)
        const oldPlaceholder = placeholderRefs.value[key]
        if (oldPlaceholder && placeholderObserver) placeholderObserver.unobserve(oldPlaceholder)
        delete monthRefs.value[key]
        delete placeholderRefs.value[key]
    }
}

function setMonthSentinelRef(key: string, el: HTMLElement | null) {
    if (el) {
        monthSentinelRefs.value[key] = el
        // Observe immediately if sentinel observer is already set up
        if (sentinelObserver) sentinelObserver.observe(el)
    } else {
        if (monthSentinelRefs.value[key] && sentinelObserver) {
            sentinelObserver.unobserve(monthSentinelRefs.value[key]!)
        }
        delete monthSentinelRefs.value[key]
    }
}

const yearGroups = computed(() => {
    const groups: { year: string; months: MonthMeta[] }[] = []
    for (const m of months.value) {
        const year = m.key.slice(0, 4)
        const last = groups[groups.length - 1]
        if (last && last.year === year) {
            last.months.push(m)
        } else {
            groups.push({ year, months: [m] })
        }
    }
    return groups
})

// ── Photo viewer ───────────────────────────────────────────────────────────
const viewerOpen = ref(false)
const viewerMonthKey = ref<string | null>(null)
const viewerPhotoIdx = ref(0)

const loadedMonthList = computed(() => {
    const list: MonthData[] = []
    for (const m of months.value) {
        const data = loadedMonths.value.get(m.key)
        if (data) list.push(data)
    }
    return list
})

const flatPhotos = computed(() => loadedMonthList.value.flatMap(m => m.photos))

const viewerFlatIndex = computed(() => {
    if (!viewerMonthKey.value) return 0
    let offset = 0
    for (const m of loadedMonthList.value) {
        if (m.key === viewerMonthKey.value) break
        offset += m.photos.length
    }
    return offset + viewerPhotoIdx.value
})

const selectedPhoto = computed(() => flatPhotos.value[viewerFlatIndex.value])

function openViewer(monthKey: string, idx: number) {
    viewerMonthKey.value = monthKey
    viewerPhotoIdx.value = idx
    viewerOpen.value = true
}

function navigateViewer(delta: number) {
    const newFlat = viewerFlatIndex.value + delta
    if (newFlat < 0 || newFlat >= flatPhotos.value.length) return
    let offset = 0
    for (const m of loadedMonthList.value) {
        if (newFlat < offset + m.photos.length) {
            viewerMonthKey.value = m.key
            viewerPhotoIdx.value = newFlat - offset
            return
        }
        offset += m.photos.length
    }
}

// ── Context menu ───────────────────────────────────────────────────────────
const { confirm, toast } = useDialog()
const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxPhoto = ref<Photo | null>(null)
const editModalOpen = ref(false)
const router = useRouter()

function openContextMenu(e: MouseEvent, photo: Photo) {
    e.preventDefault()
    ctxPhoto.value = photo
    ctxX.value = e.clientX
    ctxY.value = e.clientY
    ctxVisible.value = true
}

function onCtxView() {
    ctxVisible.value = false
    if (!ctxPhoto.value) return
    // Find the photo in loaded months
    for (const m of loadedMonthList.value) {
        const idx = m.photos.findIndex(p => p.id === ctxPhoto.value!.id)
        if (idx !== -1) {
            openViewer(m.key, idx)
            return
        }
    }
}

function onCtxEdit() {
    ctxVisible.value = false
    editModalOpen.value = true
}

async function onCtxDownload() {
    ctxVisible.value = false
    if (!ctxPhoto.value) return
    try {
        const { buildAssetUrl } = await import('~/utils/auth-client')
        const url = buildAssetUrl(`/api/assets/original/${ctxPhoto.value.id}`)
        const a = document.createElement('a')
        a.href = url
        a.download = ctxPhoto.value.originalName || ctxPhoto.value.filename
        a.click()
    } catch {
        toast('Failed to download photo', 'error')
    }
}

async function onCtxShare() {
    ctxVisible.value = false
    if (!ctxPhoto.value?.albumId) {
        toast('This photo is not in an album', 'info')
        return
    }
    const albumUrl = `${window.location.origin}/album/${ctxPhoto.value.albumId}`
    try {
        await navigator.clipboard.writeText(albumUrl)
        toast('Album link copied to clipboard', 'success')
    } catch {
        toast('Could not copy link', 'error')
    }
}

function onCtxGoToAlbum() {
    ctxVisible.value = false
    if (!ctxPhoto.value?.albumId) return
    router.push(`/album/${ctxPhoto.value.albumId}`)
}

async function onCtxDelete() {
    ctxVisible.value = false
    if (!ctxPhoto.value) return
    const ok = await confirm(
        `Delete "${ctxPhoto.value.originalName}"? This cannot be undone.`,
        { title: 'Delete Photo', danger: true }
    )
    if (!ok) return
    const photoId = ctxPhoto.value.id
    const albumId = ctxPhoto.value.albumId
    // Capture the containing month before splicing so the meta lookup cannot miss.
    let monthKey: string | null = null
    for (const m of loadedMonthList.value) {
        if (m.photos.some(p => p.id === photoId)) {
            monthKey = m.key
            break
        }
    }
    try {
        await $fetch(`/api/v1/album/${albumId}/photos/batch-delete`, {
            method: 'POST',
            body: { ids: [photoId] },
        })
        const m = monthKey ? loadedMonths.value.get(monthKey) : undefined
        if (m) {
            const idx = m.photos.findIndex(p => p.id === photoId)
            if (idx !== -1) m.photos.splice(idx, 1)
            m.count = Math.max(0, m.count - 1)
            m.layout = buildLayout(m.photos)
        }
        // Update months meta count
        if (monthKey) {
            const meta = months.value.find(mm => mm.key === monthKey)
            if (meta) meta.count = Math.max(0, meta.count - 1)
        }
        if (viewerMonthKey.value === monthKey) viewerOpen.value = false
        toast('Photo deleted', 'success')
    } catch (e: any) {
        toast(e?.data?.statusMessage || 'Failed to delete photo', 'error')
    }
}

function onPhotoSaved(updatedPhoto: SavedPhoto) {
    // Update photo in loaded months
    for (const m of loadedMonthList.value) {
        const idx = m.photos.findIndex(p => p.id === updatedPhoto.id)
        if (idx !== -1) {
            m.photos[idx] = { ...m.photos[idx]!, ...updatedPhoto } as Photo
            break
        }
    }
}

// ── Data loading ───────────────────────────────────────────────────────────
async function fetchMonths() {
    loadingMonths.value = true
    try {
        const res: any = await $fetch('/api/v1/photos/timeline', { params: { mode: 'months' } })
        months.value = res.months.map((m: any) => ({
            ...m,
            shortLabel: m.label.split(' ')[0] || m.label,
        }))
        if (months.value.length > 0) {
            activeMonthKey.value = months.value[0]!.key
            // Only the newest month loads up front; the placeholder observer
            // loads the rest as the user scrolls.
            await loadMonthPhotos(months.value[0]!.key)
        }
    } catch (e: any) {
        console.error(e)
    } finally {
        loadingMonths.value = false
    }
}

async function loadMonthPhotos(key: string, append = false) {
    const container = scrollContainer.value
    const oldHeight = container
        ? monthRefs.value[key]?.getBoundingClientRect().height ?? knownHeights[key]
        : undefined
    let monthData = loadedMonths.value.get(key)

    if (!monthData) {
        const meta = months.value.find(m => m.key === key)
        if (!meta) return
        const newData = reactive<MonthData>({
            ...meta,
            photos: [],
            layout: null,
            loading: true,
            loadingMore: false,
            error: '',
            hasMore: false,
            page: 1,
        })
        loadedMonths.value.set(key, newData)
        monthData = newData
    } else if (append) {
        if (!monthData.hasMore || monthData.loadingMore) return
        monthData.loadingMore = true
    } else {
        if (monthData.loading || monthData.loadingMore) return
        monthData.loading = true
        monthData.error = ''
        monthData.page = 1
    }

    try {
        if (monthData.loading) monthData.photos = []
        const res: any = await $fetch('/api/v1/photos/timeline', {
            params: { mode: 'photos', month: key, page: monthData.page, limit: 50 }
        })
        if (monthData.loading) {
            monthData.photos = res.photos
        } else {
            monthData.photos.push(...res.photos)
        }
        monthData.hasMore = res.pagination.hasMore
        if (monthData.hasMore) monthData.page++
        monthData.layout = buildLayout(monthData.photos)
    } catch (e: any) {
        monthData.error = e?.data?.statusMessage || 'Failed to load photos.'
    } finally {
        monthData.loading = false
        monthData.loadingMore = false
    }

    await nextTick()
    const newHeight = monthRefs.value[key]?.getBoundingClientRect().height
    if (container && oldHeight !== undefined && newHeight) {
        // A placeholder above the viewport was replaced by real content with a
        // different height; keep the visible content from jumping.
        const delta = newHeight - oldHeight
        const above = (monthRefs.value[key]?.getBoundingClientRect().bottom ?? 0) - container.getBoundingClientRect().top
        if (above < 0) {
            container.scrollTop += delta
        }
    }
}

// ── Scroll tracking ────────────────────────────────────────────────────────
let monthObserver: IntersectionObserver | null = null

function setupMonthObserver() {
    monthObserver?.disconnect()
    if (!scrollContainer.value) return
    monthObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
            const key = (visible[0]!.target as HTMLElement).dataset.monthKey
            if (key) activeMonthKey.value = key
        }
    }, { root: scrollContainer.value, threshold: 0.1, rootMargin: '-5% 0px -60% 0px' })

    nextTick(() => {
        for (const [key, el] of Object.entries(monthRefs.value)) {
            el.dataset.monthKey = key
            monthObserver!.observe(el)
        }
    })
}

// Loads placeholder months shortly before they enter the viewport.
function setupPlaceholderObserver() {
    placeholderObserver?.disconnect()
    if (!scrollContainer.value) return
    placeholderObserver = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const key = (entry.target as HTMLElement).dataset.monthKey
            if (!key || isMonthLoaded(key)) continue
            placeholderObserver?.unobserve(entry.target)
            await loadMonthPhotos(key)
            setupMonthObserver()
            setupSentinelObserver()
            setupUnloadObserver()
        }
    }, { root: scrollContainer.value, rootMargin: '800px 0px' })

    nextTick(() => {
        if (!placeholderObserver) return
        for (const el of Object.values(placeholderRefs.value)) {
            placeholderObserver.observe(el)
        }
    })
}

// Discards months far outside the viewport so hundreds of tiles don't stay in
// the DOM. The per-month sentinel handles pagination when a month is reloaded;
// a reloaded month simply refetches page 1.
function setupUnloadObserver() {
    unloadObserver?.disconnect()
    if (!scrollContainer.value) return
    unloadObserver = new IntersectionObserver((entries) => {
        if (viewerOpen.value) return
        for (const entry of entries) {
            if (entry.isIntersecting) continue
            const key = (entry.target as HTMLElement).dataset.monthKey
            if (!key) continue
            const monthData = loadedMonths.value.get(key)
            if (!monthData || monthData.loading || monthData.loadingMore) continue
            if (key === activeMonthKey.value) continue
            unloadMonth(key)
        }
    }, { root: scrollContainer.value, rootMargin: '-300% 0px -300% 0px' })

    nextTick(() => {
        if (!unloadObserver) return
        for (const el of Object.values(monthRefs.value)) {
            unloadObserver.observe(el)
        }
    })
}

function setupSentinelObserver() {
    sentinelObserver?.disconnect()
    if (!scrollContainer.value) return
    sentinelObserver = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const key = (entry.target as HTMLElement).dataset.sentinelKey
            if (!key) continue
            const monthData = loadedMonths.value.get(key)
            if (monthData?.hasMore && !monthData.loadingMore && !monthData.loading) {
                await loadMonthPhotos(key, true)
            }
        }
    }, { root: scrollContainer.value, rootMargin: '400px' })

    // Observe all existing sentinels
    nextTick(() => {
        for (const [key, el] of Object.entries(monthSentinelRefs.value)) {
            el.dataset.sentinelKey = key
            sentinelObserver!.observe(el)
        }
    })
}

// Revert a loaded month back to its placeholder, preserving its measured
// height as the new estimate so the layout and scroll position stay stable.
function unloadMonth(key: string) {
    const monthData = loadedMonths.value.get(key)
    const sectionEl = monthRefs.value[key]
    const realHeight = sectionEl?.getBoundingClientRect().height
    if (monthData && realHeight) knownHeights[key] = realHeight
    if (monthData) {
        monthData.photos = []
        monthData.layout = null
        monthData.loading = false
        monthData.loadingMore = false
        monthData.error = ''
        monthData.hasMore = false
        monthData.page = 1
    }

    nextTick(() => {
        const container = scrollContainer.value
        const newHeight = monthRefs.value[key]?.getBoundingClientRect().height
        if (container && realHeight && newHeight) {
            // Only compensate when the section is entirely above the viewport.
            const above = (monthRefs.value[key]?.getBoundingClientRect().bottom ?? 0) - container.getBoundingClientRect().top
            if (above < 0) {
                container.scrollTop += newHeight - realHeight
            }
        }
        setupMonthObserver()
        setupSentinelObserver()
        setupUnloadObserver()
    })
}

async function jumpToMonth(key: string) {
    const container = scrollContainer.value
    if (!container) return

    if (!isMonthLoaded(key)) {
        await loadMonthPhotos(key)
        await nextTick()
        setupMonthObserver()
        setupPlaceholderObserver()
        setupSentinelObserver()
        setupUnloadObserver()

        // Proactively load the nearest unloaded neighbors so scrolling past the
        // target does not stall on the next placeholder.
        const metaIndex = months.value.findIndex(m => m.key === key)
        const neighbors = months.value
            .map((m, i) => ({ m, i }))
            .filter(({ m, i }) => i !== metaIndex && !isMonthLoaded(m.key))
            .sort((a, b) => Math.abs(a.i - metaIndex) - Math.abs(b.i - metaIndex))
            .slice(0, 2)
        await Promise.all(neighbors.map(({ m }) => loadMonthPhotos(m.key)))
    }

    await nextTick()
    const el = monthRefs.value[key]
    if (el && container) {
        const elTop = el.getBoundingClientRect().top
        const containerTop = container.getBoundingClientRect().top
        const stickyHeaderOffset = typeof window !== 'undefined' && window.innerWidth < 640 ? 52 : 48
        const offset = Math.max(0, elTop - containerTop + container.scrollTop - stickyHeaderOffset)
        const distance = Math.abs(offset - container.scrollTop)
        container.scrollTo({ top: offset, behavior: distance <= container.clientHeight * 2 ? 'smooth' : 'auto' })
    }
    activeMonthKey.value = key
}


// ── Lifecycle ──────────────────────────────────────────────────────────────
// Track scroll for active month highlight (fallback / extra robustness)
function onScroll() {
    // IntersectionObserver handles it, but keep for potential future use
}

onMounted(async () => {
    await fetchMonths()

    await nextTick()
    setupResizeObserver()
    setupPlaceholderObserver()
    setupMonthObserver()
    setupSentinelObserver()
    setupUnloadObserver()
})

onUnmounted(() => {
    placeholderObserver?.disconnect()
    monthObserver?.disconnect()
    sentinelObserver?.disconnect()
    unloadObserver?.disconnect()
    resizeObserver?.disconnect()
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.timeline-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

.timeline-layout {
    display: flex;
    flex: 1;
    position: relative;
    min-height: 0;
}

.timeline-content {
    flex: 1;
    min-width: 0;
    overflow-y: scroll;
    overflow-x: hidden;
    /* Hide the browser's native scrollbar */
    scrollbar-width: none;
}
.timeline-content::-webkit-scrollbar { display: none; }

/* ── Right-side scrollbar ─────────────────────────────────────────────────── */
.timeline-scrollbar {
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    max-height: 85vh;
}

.scrollbar-inner {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 85vh;
    padding: 6px 10px 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 0;
    scrollbar-width: none;
}
.scrollbar-inner::-webkit-scrollbar { display: none; }

.scrollbar-year-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-top: 10px;
    margin-bottom: 1px;
    padding-right: 2px;
    text-align: right;
    user-select: none;
    opacity: 0.55;
}
.scrollbar-year-label.mt-0 { margin-top: 2px; }

.scrollbar-month-tick {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
    height: 22px;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
    transition: all 0.15s ease;
    min-width: 40px;
}

.tick-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-3);
    flex-shrink: 0;
    transition: all 0.2s ease;
    opacity: 0.5;
}

.tick-label {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-3);
    transition: all 0.15s ease;
    text-align: right;
    opacity: 0;
    transform: translateX(2px);
    pointer-events: none;
    white-space: nowrap;
}

.scrollbar-month-tick:hover .tick-label,
.scrollbar-month-active .tick-label,
.scrollbar-month-hovered .tick-label {
    opacity: 1;
    transform: translateX(0);
}

.scrollbar-month-tick:hover .tick-dot {
    background: var(--accent);
    opacity: 1;
    width: 7px;
    height: 7px;
}

.scrollbar-month-active .tick-dot {
    background: var(--accent);
    opacity: 1;
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

.scrollbar-month-active .tick-label {
    color: var(--accent);
    font-weight: 700;
    opacity: 1;
    transform: translateX(0);
}

.scrollbar-month-hovered .tick-dot {
    background: var(--accent);
    opacity: 0.8;
}

.scrollbar-month-hovered .tick-label {
    color: var(--text-1);
    opacity: 1;
    transform: translateX(0);
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
.scrollbar-tooltip {
    position: fixed;
    right: 56px;
    top: 50%;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    padding: 5px 12px;
    border-radius: 8px;
    pointer-events: none;
    z-index: 50;
    background: var(--surface-1);
    color: var(--text-1);
    border: 1px solid var(--separator);
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 6px;
}

.tooltip-count {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-3);
}

.tooltip-enter-active, .tooltip-leave-active {
    transition: opacity 0.12s ease, transform 0.12s ease;
}
.tooltip-enter-from, .tooltip-leave-to {
    opacity: 0;
    transform: translateX(4px);
}

/* ── Month placeholders ──────────────────────────────────────────────────── */
.timeline-skeleton {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    border-radius: 12px;
    background: var(--surface-1);
    border: 1px solid var(--separator);
    padding: 16px;
}

.timeline-skeleton-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    flex: 1;
    min-height: 120px;
}

.timeline-skeleton-row:nth-child(2) {
    grid-template-columns: 1.4fr 1fr 1.2fr;
}

.timeline-skeleton-block {
    border-radius: 10px;
    background: var(--surface-2);
    animation: timeline-shimmer 1.8s ease-in-out infinite;
}

@keyframes timeline-shimmer {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
    .timeline-scrollbar {
        max-height: 70vh;
    }
    .scrollbar-tooltip {
        display: none;
    }
    .timeline-skeleton {
        gap: 8px;
        padding: 10px;
    }
    .timeline-skeleton-row {
        gap: 8px;
        min-height: 96px;
    }
}
</style>
