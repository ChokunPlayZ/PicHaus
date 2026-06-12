<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="All Photos" :showBack="true" backTo="/album" :solid="true" />

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
                        class="px-3 py-2 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                        <option value="">All Cameras</option>
                        <option v-for="cam in options.cameras" :key="cam" :value="cam">{{ cam }}</option>
                    </select>

                    <select v-model="filters.lens" @change="applyFilters"
                        class="px-3 py-2 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                        <option value="">All Lenses</option>
                        <option v-for="l in options.lenses" :key="l" :value="l">{{ l }}</option>
                    </select>

                    <input v-model="filters.dateFrom" @change="applyFilters" type="date"
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

                <div v-else-if="photos.length === 0"
                    class="text-center py-20 rounded-3xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                        style="background: var(--surface-3);">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" style="color: var(--text-3);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2" style="color: var(--text-1);">No photos found</h3>
                    <p class="text-sm mb-6" style="color: var(--text-2);">Try adjusting your filters or upload more photos.</p>
                    <button @click="clearFilters" v-if="hasActiveFilters"
                        class="px-6 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--accent); color: var(--accent-text);">
                        Reset Filters
                    </button>
                </div>

                <div v-else-if="picturesLayout" ref="containerRef" class="relative transition-opacity duration-300"
                    :class="{ 'opacity-50': loading }"
                    :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                    <div v-for="(photo, index) in photos" :key="photo.id"
                        class="absolute cursor-pointer overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5 group"
                        style="background: var(--surface-3);"
                        :style="{
                            top: `${picturesLayout.getPosition(index).top}px`,
                            left: `${picturesLayout.getPosition(index).left}px`,
                            width: `${picturesLayout.getPosition(index).width}px`,
                            height: `${picturesLayout.getPosition(index).height}px`,
                        }" @click="openViewer(index)">

                        <div class="absolute inset-0 animate-pulse" style="background: var(--surface-3);" v-if="!photo.blurhash"></div>
                        <img v-if="photo.blurhash"
                            :src="getBlurhashUrl(photo.blurhash, photo.width!, photo.height!) || ''"
                            class="absolute inset-0 w-full h-full object-cover" />

                        <img :src="buildAssetUrl(`/api/assets/thumb/${photo.id}`)" loading="lazy"
                            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 hover:opacity-100" />

                        <!-- Overlay -->
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>

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
                                    class="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-white backdrop-blur-md">f/{{ photo.aperture }}</span>
                                <span v-if="photo.iso" class="text-[10px] text-white/60">ISO {{ photo.iso }}</span>
                            </div>
                        </div>
                    </div>
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
            :has-next="viewerIndex < photos.length - 1" @close="viewerOpen = false" @previous="viewerIndex--"
            @next="viewerIndex++" />
    </div>
</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'
import { debounce } from 'lodash-es'
import { buildAssetUrl } from '~/utils/auth-client'

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

    // Calculate container width - measure parent because we set strict width on self
    const containerWidth = containerRef.value?.parentElement?.clientWidth || Math.min(window.innerWidth - 32, 1280 - 32)

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
        rowHeight: 180,
        rowWidth: containerWidth,
        spacing: 12,
        heightTolerance: 0.1
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
