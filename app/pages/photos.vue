```html
<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar title="All Photos" :showBack="true" backTo="/album" />

        <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header & Filters -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-white mb-2">My Gallery</h1>
                    <p class="text-[var(--text-muted)]">
                        {{ total }} photos in your library
                    </p>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap items-center gap-3">
                    <!-- Standard filters (Camera, Lens) -->
                    <div class="relative group">
                        <select v-model="filters.camera" @change="applyFilters"
                            class="appearance-none bg-[var(--glass-bg)] border border-[var(--glass-border-light)] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--btn-primary-start)] hover:bg-white/10 transition cursor-pointer">
                            <option value="">All Cameras</option>
                            <option v-for="cam in options.cameras" :key="cam" :value="cam">{{ cam }}</option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>

                    <div class="relative group">
                        <select v-model="filters.lens" @change="applyFilters"
                            class="appearance-none bg-[var(--glass-bg)] border border-[var(--glass-border-light)] text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--btn-primary-start)] hover:bg-white/10 transition cursor-pointer">
                            <option value="">All Lenses</option>
                            <option v-for="l in options.lenses" :key="l" :value="l">{{ l }}</option>
                        </select>
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>

                    <input v-model="filters.dateFrom" @change="applyFilters" type="date" placeholder="Start Date"
                        class="bg-[var(--glass-bg)] border border-[var(--glass-border-light)] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--btn-primary-start)] hover:bg-white/10 transition" />

                    <button v-if="hasActiveFilters" @click="clearFilters"
                        class="text-red-300 hover:text-red-200 text-sm font-medium px-2 transition">
                        Clear
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="pb-12 min-h-[50vh]">
                <div v-if="loading && photos.length === 0" class="flex justify-center py-20">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>

                <div v-else-if="photos.length === 0"
                    class="text-center py-20 text-[var(--text-muted)] bg-[var(--glass-bg)] rounded-3xl border border-[var(--glass-border-light)]">
                    <div class="text-6xl mb-4 grayscale opacity-50">📷</div>
                    <h3 class="text-xl font-bold text-white mb-2">No photos found</h3>
                    <p>Try adjusting your filters or upload more photos.</p>
                    <button @click="clearFilters" v-if="hasActiveFilters"
                        class="mt-6 px-6 py-2 bg-[var(--btn-primary-start)] text-white rounded-full hover:opacity-90 transition">
                        Reset Filters
                    </button>
                </div>

                <div v-else-if="picturesLayout" ref="containerRef" class="relative transition-opacity duration-300"
                    :class="{ 'opacity-50': loading }"
                    :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                    <div v-for="(photo, index) in photos" :key="photo.id"
                        class="absolute overflow-hidden rounded-lg bg-[var(--glass-bg-strong)] cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-out border border-white/5"
                        :style="{
                            top: `${picturesLayout.getPosition(index).top}px`,
                            left: `${picturesLayout.getPosition(index).left}px`,
                            width: `${picturesLayout.getPosition(index).width}px`,
                            height: `${picturesLayout.getPosition(index).height}px`,
                        }" @click="openViewer(index)">

                        <div class="absolute inset-0 bg-gray-800 animate-pulse" v-if="!photo.blurhash"></div>
                        <img v-if="photo.blurhash"
                            :src="getBlurhashUrl(photo.blurhash, photo.width!, photo.height!) || ''"
                            class="absolute inset-0 w-full h-full object-cover" />

                        <img :src="`/api/assets/${photo.id}/thumb`" loading="lazy"
                            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 hover:opacity-100" />

                        <!-- Overlay -->
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
                        </div>

                        <!-- Hover Info -->
                        <div
                            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex justify-between items-end">
                            <div class="overflow-hidden">
                                <p class="text-white font-medium text-sm truncate">{{ photo.originalName }}</p>
                                <div class="flex items-center gap-2 text-xs text-white/70 mt-0.5">
                                    <span v-if="photo.cameraModel">{{ photo.cameraModel }}</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <span v-if="photo.aperture"
                                    class="text-xs font-mono bg-white/20 px-1.5 py-0.5 rounded text-white backdrop-blur-md">f/{{
                                        photo.aperture }}</span>
                                <span v-if="photo.iso" class="text-[10px] text-white/60">ISO {{ photo.iso }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div ref="sentinel" class="h-20 flex justify-center items-center mt-8">
                    <div v-if="loadingMore" class="flex items-center gap-2 text-purple-300 text-sm">
                        <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin">
                        </div>
                        Loading more...
                    </div>
                </div>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="viewerOpen && selectedPhoto" :photo="selectedPhoto" :has-previous="viewerIndex > 0"
            :has-next="viewerIndex < photos.length - 1" @close="viewerOpen = false" @previous="viewerIndex--"
            @next="viewerIndex++" />
    </div>
</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'
import { debounce } from 'lodash-es'

// Create proper interface for our photo object
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
    cameraModel?: string | null
    lens?: string | null
    aperture?: string | null
    iso?: number | null
    shutterSpeed?: string | null
    uploader: {
        id: string
        name: string | null
        email: string | null
        instagram: string | null
    } | null
}

const photos = ref<Photo[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
const viewerOpen = ref(false)
const viewerIndex = ref(0)

const containerRef = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

const options = reactive({
    cameras: [] as string[],
    lenses: [] as string[]
})

const filters = ref({
    camera: '',
    lens: '',
    aperture: '',
    iso: '',
    shutterSpeed: '',
    dateFrom: '',
    dateTo: ''
})

// Computed for selected photo to ensure safety
const selectedPhoto = computed(() => {
    if (viewerIndex.value < 0 || viewerIndex.value >= photos.value.length) return undefined
    return photos.value[viewerIndex.value]
})

const hasActiveFilters = computed(() => {
    return Object.values(filters.value).some(v => v !== '')
})

// Fetch initial data logic
const fetchPhotos = async (reset = false) => {
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

        updateLayout()

    } catch (e) {
        console.error(e)
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

const applyFilters = () => fetchPhotos(true)
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

// Layout Logic
const picturesLayout = shallowRef<any>(null)

const updateLayout = () => {
    if (photos.value.length === 0) return

    // Calculate container width - default to window width minus padding if container not ready
    const containerWidth = containerRef.value?.clientWidth || Math.min(window.innerWidth - 32, 1600 - 32)

    // Check for missing dimensions
    const validPhotos = photos.value.map(p => ({
        width: p.width || 1920,
        height: p.height || 1080
    }))

    const aspectRatios = new Float32Array(
        validPhotos.map(photo => photo.width / photo.height)
    )

    // Calculate layout
    picturesLayout.value = new JustifiedLayout(aspectRatios, {
        rowHeight: 320, // Taller rows for better visibility
        rowWidth: containerWidth,
        spacing: 16, // More breathing room
        heightTolerance: 0.15
    })
}

// Image Utilities
const getBlurhashUrl = (hash: string, width: number, height: number) => {
    if (!hash || !width || !height) return null
    try {
        const pixels = decode(hash, 32, 32)
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        const imageData = ctx.createImageData(32, 32)
        imageData.data.set(pixels)
        ctx.putImageData(imageData, 0, 0)
        return canvas.toDataURL()
    } catch (e) {
        return null
    }
}

const openViewer = (index: number) => {
    viewerIndex.value = index
    viewerOpen.value = true
}

// Lifecycle
onMounted(() => {
    fetchOptions()
    fetchPhotos(true)

    // Resize observer for layout
    resizeObserver = new ResizeObserver(debounce(() => {
        updateLayout()
    }, 100))

    // Observe a parent element that always exists to catch window resizes effectively
    if (containerRef.value?.parentElement) {
        resizeObserver.observe(containerRef.value.parentElement)
    } else {
        // Fallback
        const app = document.querySelector('#app') || document.body
        resizeObserver.observe(app)
    }

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
    if (resizeObserver) resizeObserver.disconnect()
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
