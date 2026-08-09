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
                        v-for="monthData in loadedMonths"
                        :key="monthData.key"
                        :ref="el => setMonthRef(monthData.key, el as HTMLElement | null)"
                        class="timeline-month-section mb-12"
                    >
                        <!-- Month header -->
                        <div class="flex items-center gap-4 mb-5 sticky top-0 z-10 py-2"
                            style="background: var(--bg-page);">
                            <div class="flex items-center gap-3">
                                <div class="w-1 h-8 rounded-full" style="background: var(--accent);"></div>
                                <div>
                                    <h2 class="text-xl font-bold tracking-tight" style="color: var(--text-1);">
                                        {{ monthData.label }}
                                    </h2>
                                    <p class="text-xs mt-0.5" style="color: var(--text-3);">
                                        {{ monthData.count }} {{ monthData.count === 1 ? 'photo' : 'photos' }}
                                    </p>
                                </div>
                            </div>
                            <div class="flex-1 h-px" style="background: var(--separator);"></div>
                        </div>

                        <!-- Loading state for this month's photos -->
                        <div v-if="monthData.loading" class="flex justify-center py-12">
                            <div class="flex items-center gap-3 text-sm" style="color: var(--text-3);">
                                <div class="w-5 h-5 border-2 rounded-full animate-spin"
                                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                                Loading photos…
                            </div>
                        </div>

                        <!-- Error state -->
                        <div v-else-if="monthData.error" class="py-6 text-center rounded-2xl px-4"
                            style="background: var(--error-bg); border: 1px solid var(--error-border);">
                            <p class="text-sm mb-3" style="color: var(--error-text);">{{ monthData.error }}</p>
                            <button @click="loadMonthPhotos(monthData.key)"
                                class="text-xs px-4 py-1.5 rounded-full"
                                style="background: var(--accent); color: var(--accent-text);">
                                Retry
                            </button>
                        </div>

                        <!-- Justified layout grid -->
                        <div v-else-if="monthData.photos.length > 0 && monthData.layout"
                            class="relative w-full"
                            :style="{ height: `${monthData.layout.containerHeight}px` }">
                            <PhotoTile
                                v-for="(photo, idx) in monthData.photos"
                                :key="photo.id"
                                :photo="photo"
                                :position="monthData.layout.getPosition(idx)"
                                :show-hover-info="true"
                                :show-action-menu="true"
                                @click="openViewer(monthData.key, idx)"
                                @contextmenu="openContextMenu($event, photo)"
                                @action-menu="openContextMenu($event, photo)"
                            />
                        </div>

                        <!-- Per-month sentinel: triggers next-page load when scrolled into view -->
                        <div v-if="monthData.hasMore"
                            :ref="el => setMonthSentinelRef(monthData.key, el as HTMLElement | null)"
                            class="h-16 flex items-center justify-center">
                            <div v-if="monthData.loadingMore" class="flex items-center gap-2 text-xs" style="color: var(--text-3);">
                                <div class="w-4 h-4 border-2 rounded-full animate-spin"
                                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                                Loading more…
                            </div>
                        </div>

                    </div>

                    <!-- Sentinel for lazy-loading more months -->
                    <div ref="sentinel" class="h-4"></div>
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

// ── Layout helpers ─────────────────────────────────────────────────────────
const scrollContainer = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
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

function setupResizeObserver() {
    resizeObserver?.disconnect()
    if (!gridContainerRef.value) return
    resizeObserver = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width
        if (w && w > 0 && w !== containerWidth.value) {
            containerWidth.value = w
            // Rebuild all layouts with new width
            for (const m of loadedMonths.value) {
                if (m.photos.length) m.layout = buildLayout(m.photos)
            }
        }
    })
    resizeObserver.observe(gridContainerRef.value)
}

// ── Data ───────────────────────────────────────────────────────────────────
const loadingMonths = ref(true)
const months = ref<MonthMeta[]>([])
const loadedMonths = ref<MonthData[]>([])
const loadedMonthKeys = ref<Set<string>>(new Set())
const BATCH_SIZE = 3

// ── Scrollbar ──────────────────────────────────────────────────────────────
const activeMonthKey = ref<string | null>(null)
const hoverMonthKey = ref<string | null>(null)
const monthRefs = ref<Record<string, HTMLElement>>({})
const monthSentinelRefs = ref<Record<string, HTMLElement>>({})
let sentinelObserver: IntersectionObserver | null = null

function setMonthRef(key: string, el: HTMLElement | null) {
    if (el) monthRefs.value[key] = el
    else delete monthRefs.value[key]
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

const flatPhotos = computed(() => loadedMonths.value.flatMap(m => m.photos))

const viewerFlatIndex = computed(() => {
    if (!viewerMonthKey.value) return 0
    let offset = 0
    for (const m of loadedMonths.value) {
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
    for (const m of loadedMonths.value) {
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
    for (const m of loadedMonths.value) {
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
    try {
        await $fetch(`/api/v1/album/${albumId}/photos/batch-delete`, {
            method: 'POST',
            body: { ids: [photoId] },
        })
        // Remove from loaded months
        for (const m of loadedMonths.value) {
            const idx = m.photos.findIndex(p => p.id === photoId)
            if (idx !== -1) {
                m.photos.splice(idx, 1)
                m.count = Math.max(0, m.count - 1)
                if (m.photos.length > 0) m.layout = buildLayout(m.photos)
                break
            }
        }
        // Update months meta count
        const meta = months.value.find(m => m.key === loadedMonths.value.find(lm => lm.photos.findIndex(p => p.id === photoId) !== -1)?.key)
        if (meta) meta.count = Math.max(0, meta.count - 1)
        toast('Photo deleted', 'success')
    } catch (e: any) {
        toast(e?.data?.statusMessage || 'Failed to delete photo', 'error')
    }
}

function onPhotoSaved(updatedPhoto: Photo) {
    // Update photo in loaded months
    for (const m of loadedMonths.value) {
        const idx = m.photos.findIndex(p => p.id === updatedPhoto.id)
        if (idx !== -1) {
            m.photos[idx] = { ...m.photos[idx], ...updatedPhoto }
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
            await loadNextBatch()
        }
    } catch (e: any) {
        console.error(e)
    } finally {
        loadingMonths.value = false
    }
}

async function loadMonthPhotos(key: string, append = false) {
    let monthData = loadedMonths.value.find(m => m.key === key)

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
        // Maintain months order (desc)
        const insertIndex = months.value.findIndex(m => m.key === key)
        let loadedInsertIdx = loadedMonths.value.length
        for (let i = 0; i < loadedMonths.value.length; i++) {
            const existingMonthIdx = months.value.findIndex(m => m.key === loadedMonths.value[i]!.key)
            if (existingMonthIdx > insertIndex) {
                loadedInsertIdx = i
                break
            }
        }
        loadedMonths.value.splice(loadedInsertIdx, 0, newData)
        loadedMonthKeys.value.add(key)
        monthData = newData
    } else if (append) {
        if (!monthData.hasMore || monthData.loadingMore) return
        monthData.loadingMore = true
    } else {
        monthData.loading = true
        monthData.error = ''
        monthData.photos = []
        monthData.page = 1
    }

    try {
        const res: any = await $fetch('/api/v1/photos/timeline', {
            params: { mode: 'photos', month: key, page: monthData.page, limit: 50 }
        })
        monthData.photos.push(...res.photos)
        monthData.hasMore = res.pagination.hasMore
        if (monthData.hasMore) monthData.page++
        monthData.layout = buildLayout(monthData.photos)
    } catch (e: any) {
        monthData.error = e?.data?.statusMessage || 'Failed to load photos.'
    } finally {
        monthData.loading = false
        monthData.loadingMore = false
    }
}

async function loadNextBatch() {
    const unloaded = months.value.filter(m => !loadedMonthKeys.value.has(m.key))
    const toLoad = unloaded.slice(0, BATCH_SIZE)
    await Promise.all(toLoad.map(m => loadMonthPhotos(m.key)))
}

// ── Scroll tracking ────────────────────────────────────────────────────────
let intersectionObserver: IntersectionObserver | null = null
let monthObserver: IntersectionObserver | null = null

function setupMonthObserver() {
    monthObserver?.disconnect()
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

function setupSentinelObserver() {
    sentinelObserver?.disconnect()
    sentinelObserver = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const key = (entry.target as HTMLElement).dataset.sentinelKey
            if (!key) continue
            const monthData = loadedMonths.value.find(m => m.key === key)
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

async function jumpToMonth(key: string) {
    if (!loadedMonthKeys.value.has(key)) {
        await loadMonthPhotos(key)
        await nextTick()
        setupMonthObserver()
        setupSentinelObserver()
    }
    await nextTick()
    const el = monthRefs.value[key]
    const container = scrollContainer.value
    if (el && container) {
        const elTop = el.getBoundingClientRect().top
        const containerTop = container.getBoundingClientRect().top
        const offset = elTop - containerTop + container.scrollTop
        container.scrollTo({ top: offset, behavior: 'smooth' })
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

    if (sentinel.value) {
        intersectionObserver = new IntersectionObserver(async (entries) => {
            if (entries[0]?.isIntersecting) {
                const remaining = months.value.filter(m => !loadedMonthKeys.value.has(m.key))
                if (remaining.length > 0) {
                    await loadNextBatch()
                    setupMonthObserver()
                    setupSentinelObserver()
                }
            }
        }, { root: scrollContainer.value, rootMargin: '600px' })
        intersectionObserver.observe(sentinel.value)
    }

    setupMonthObserver()
    setupSentinelObserver()
})

onUnmounted(() => {
    intersectionObserver?.disconnect()
    monthObserver?.disconnect()
    sentinelObserver?.disconnect()
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

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
    .timeline-scrollbar {
        max-height: 70vh;
    }
    .scrollbar-tooltip {
        display: none;
    }
}
</style>
