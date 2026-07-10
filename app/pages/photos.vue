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
                        @click="openViewer(index)"
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
    </div>
</template>

<script setup lang="ts">
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
    updatedAt?: number | null
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

const route = useRoute()
const router = useRouter()

const photos = ref<Photo[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
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
