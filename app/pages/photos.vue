<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="All Photos" :solid="true" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--text-1);">My Gallery</h1>
                    <p class="text-sm" style="color: var(--text-2);">
                        {{ total }} photos in your library
                    </p>
                </div>
            </div>

            <!-- Filters -->
            <div class="mb-8 rounded-2xl p-4"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="flex flex-wrap items-center gap-3">
                    <span class="text-sm font-medium" style="color: var(--text-2);">Filters:</span>

                    <select v-model="filters.camera" @change="applyFilters"
                        aria-label="Filter by camera"
                        class="px-3 py-2 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                        <option value="">All Cameras</option>
                        <option v-for="cam in options.cameras" :key="cam" :value="cam">{{ cam }}</option>
                    </select>

                    <select v-model="filters.lens" @change="applyFilters"
                        aria-label="Filter by lens"
                        class="px-3 py-2 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                        <option value="">All Lenses</option>
                        <option v-for="l in options.lenses" :key="l" :value="l">{{ l }}</option>
                    </select>

                    <input v-model="filters.dateFrom" @change="applyFilters" type="date"
                        aria-label="Filter from date"
                        class="px-3 py-2 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />

                    <button v-if="hasActiveFilters" @click="clearFilters"
                        class="px-3 py-2 rounded-full text-sm transition"
                        style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);">
                        Clear Filters
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="pb-12 min-h-[50vh]">
                <div v-if="loading && photos.length === 0" class="flex justify-center py-20">
                    <div class="w-10 h-10 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>

                <div v-else-if="loadError"
                    class="text-center py-16 rounded-3xl"
                    role="alert"
                    style="background: var(--error-bg); border: 1px solid var(--error-border);">
                    <Icon name="lucide:wifi-off" class="w-8 h-8 mx-auto mb-4" style="color: var(--error-text);" :stroke-width="1.75" />
                    <h3 class="text-lg font-semibold mb-2" style="color: var(--text-1);">Couldn’t load your photos</h3>
                    <p class="text-sm mb-5" style="color: var(--text-2);">{{ loadError }}</p>
                    <button @click="fetchPhotos(true)" class="px-5 py-2.5 rounded-full text-sm font-medium"
                        style="background: var(--accent); color: var(--accent-text);">Try Again</button>
                </div>

                <div v-else-if="photos.length === 0"
                    class="text-center py-20 rounded-3xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                        style="background: var(--surface-3);">
                        <Icon name="lucide:camera" class="w-8 h-8" style="color: var(--text-3);" :stroke-width="1.5" />
                    </div>
                    <h3 class="text-xl font-bold mb-2" style="color: var(--text-1);">No photos found</h3>
                    <p class="text-sm mb-6" style="color: var(--text-2);">Try adjusting your filters or upload more photos.</p>
                    <button @click="clearFilters" v-if="hasActiveFilters"
                        class="px-6 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--accent); color: var(--accent-text);">
                        Reset Filters
                    </button>
                </div>

                <div v-else-if="picturesLayout" ref="containerRef" class="relative w-full transition-opacity duration-300"
                    :class="{ 'opacity-50': loading }"
                    :style="{ height: `${picturesLayout.containerHeight}px` }">
                    <PhotoTile
                        v-for="(photo, index) in photos"
                        :key="photo.id"
                        :photo="photo"
                        :position="picturesLayout.getPosition(index)"
                        :show-hover-info="true"
                        :show-action-menu="true"
                        @click="openViewer(index)"
                        @contextmenu="openContextMenu($event, photo)"
                        @action-menu="openContextMenu($event, photo)"
                    />
                </div>

                <div ref="sentinel" class="h-20 flex justify-center items-center mt-8">
                    <div v-if="loadingMore" class="flex items-center gap-2 text-sm" style="color: var(--text-3);">
                        <div class="w-4 h-4 border-2 rounded-full animate-spin"
                            style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                        Loading more…
                    </div>
                </div>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="viewerOpen && selectedPhoto" :photo="selectedPhoto" :has-previous="viewerIndex > 0"
            :has-next="viewerIndex < photos.length - 1" :previous-photo-id="previousPhotoId"
            :next-photo-id="nextPhotoId" :previous-photo-timestamp="previousPhotoTimestamp"
            :next-photo-timestamp="nextPhotoTimestamp" @close="viewerOpen = false" @previous="viewerIndex--"
            @next="viewerIndex++" />

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
import { debounce } from 'lodash-es'

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
    iso?: number | null
    shutterSpeed?: string | null
    albumId?: string | null
    uploader: {
        id: string
        name: string | null
        email: string | null
        instagram: string | null
    } | null
}

const route = useRoute()
const router = useRouter()

const photos = ref<Photo[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
const loadError = ref('')
const viewerOpen = ref(false)
const viewerIndex = ref(0)

const sentinel = ref<HTMLElement | null>(null)
let intersectionObserver: IntersectionObserver | null = null

const { containerRef, picturesLayout } = useJustifiedLayout(photos)

const options = reactive({
    cameras: [] as string[],
    lenses: [] as string[]
})

const filters = ref({
    camera: (route.query.camera as string) || '',
    lens: (route.query.lens as string) || '',
    aperture: (route.query.aperture as string) || '',
    iso: (route.query.iso as string) || '',
    shutterSpeed: (route.query.shutterSpeed as string) || '',
    dateFrom: (route.query.dateFrom as string) || '',
    dateTo: (route.query.dateTo as string) || ''
})

// Computed for selected photo to ensure safety
const selectedPhoto = computed(() => {
    if (viewerIndex.value < 0 || viewerIndex.value >= photos.value.length) return undefined
    return photos.value[viewerIndex.value]
})

const previousPhotoId = computed(() => {
    if (!viewerOpen.value || viewerIndex.value <= 0) return null
    return photos.value[viewerIndex.value - 1]?.id || null
})

const nextPhotoId = computed(() => {
    if (!viewerOpen.value || viewerIndex.value >= photos.value.length - 1) return null
    return photos.value[viewerIndex.value + 1]?.id || null
})

const previousPhotoTimestamp = computed(() => {
    if (!viewerOpen.value || viewerIndex.value <= 0) return null
    const photo = photos.value[viewerIndex.value - 1]
    return photo ? photo.updatedAt || photo.createdAt || null : null
})

const nextPhotoTimestamp = computed(() => {
    if (!viewerOpen.value || viewerIndex.value >= photos.value.length - 1) return null
    const photo = photos.value[viewerIndex.value + 1]
    return photo ? photo.updatedAt || photo.createdAt || null : null
})

const hasActiveFilters = computed(() => {
    return Object.values(filters.value).some(v => v !== '')
})

// Fetch initial data logic
const fetchPhotos = async (reset = false) => {
    loadError.value = ''
    if (reset) {
        page.value = 1
        photos.value = []
        hasMore.value = true
        loading.value = true
    } else {
        if (!hasMore.value || loadingMore.value) return
        loadingMore.value = true
    }

    try {
        const query = {
            page: page.value,
            limit: 50,
            ...Object.fromEntries(Object.entries(filters.value).filter(([_, v]) => v !== ''))
        }

        const res: any = await $fetch('/api/v1/photos', { params: query })

        if (reset) {
            photos.value = res.photos
        } else {
            photos.value.push(...res.photos)
        }

        total.value = res.pagination.total
        hasMore.value = res.pagination.hasMore
        if (hasMore.value) page.value++

    } catch (e: any) {
        console.error(e)
        loadError.value = e?.data?.statusMessage || 'Check your connection and try again.'
    } finally {
        loading.value = false
        loadingMore.value = false
    }
}

// Stats fetch for options
const fetchOptions = async () => {
    try {
        const stats: any = await $fetch('/api/v1/stats')
        if (stats?.cameras) options.cameras = stats.cameras.map((c: any) => c.model)
        if (stats?.lenses) options.lenses = stats.lenses.map((l: any) => l.model)
    } catch (e) {
        console.error('Failed to fetch stats', e)
    }
}

const applyFilters = () => {
    const query = { ...route.query }
    Object.entries(filters.value).forEach(([k, v]) => {
        if (v) {
            query[k] = v
        } else {
            delete query[k]
        }
    })
    router.replace({ query })
    fetchPhotos(true)
}
const debouncedApply = debounce(applyFilters, 500)

const clearFilters = () => {
    filters.value = {
        camera: '',
        lens: '',
        aperture: '',
        iso: '',
        shutterSpeed: '',
        dateFrom: '',
        dateTo: ''
    }
    applyFilters()
}

// Watch route.query to handle browser back/forward navigation
watch(() => route.query, (newQuery) => {
    let changed = false
    Object.keys(filters.value).forEach((key) => {
        const nextVal = (newQuery[key] as string) || ''
        if (nextVal !== (filters.value as any)[key]) {
            (filters.value as any)[key] = nextVal
            changed = true
        }
    })
    if (changed) {
        fetchPhotos(true)
    }
})

const openViewer = (index: number) => {
    viewerIndex.value = index
    viewerOpen.value = true
}

// ── Context menu ──────────────────────────────────────────────────────────
const { confirm, toast } = useDialog()
const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxPhoto = ref<Photo | null>(null)
const editModalOpen = ref(false)

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
    const idx = photos.value.findIndex(p => p.id === ctxPhoto.value!.id)
    if (idx !== -1) openViewer(idx)
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
        const idx = photos.value.findIndex(p => p.id === photoId)
        if (idx !== -1) {
            photos.value.splice(idx, 1)
            total.value = Math.max(0, total.value - 1)
        }
        toast('Photo deleted', 'success')
    } catch (e: any) {
        toast(e?.data?.statusMessage || 'Failed to delete photo', 'error')
    }
}

function onPhotoSaved(updatedPhoto: Photo) {
    const idx = photos.value.findIndex(p => p.id === updatedPhoto.id)
    if (idx !== -1) {
        photos.value[idx] = { ...photos.value[idx], ...updatedPhoto }
    }
}

// Lifecycle
onMounted(() => {
    fetchOptions()
    fetchPhotos(true)

    // Intersection observer for infinite scroll
    if (sentinel.value) {
        intersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
                fetchPhotos(false)
            }
        }, { rootMargin: '400px' })
        intersectionObserver.observe(sentinel.value)
    }
})

onUnmounted(() => {
    if (intersectionObserver) intersectionObserver.disconnect()
})
</script>

<style scoped>
@keyframes slide-in {
    from {
        transform: translateX(100%);
    }

    to {
        transform: translateX(0);
    }
}

.animate-slide-in {
    animation: slide-in 0.3s ease-out;
}
</style>
