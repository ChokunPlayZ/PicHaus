<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Initial Loading/Auth State -->
        <div v-if="!isAuthenticated" class="min-h-screen flex items-center justify-center p-4">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full shadow-xl">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-white mb-2">📸 PicHaus</h1>
                    <p v-if="loading" class="text-purple-200 animate-pulse">Loading album...</p>
                    <p v-else-if="error" class="text-red-300">{{ error }}</p>
                    <p v-else class="text-purple-200">
                        {{ albumName }}
                        <span v-if="ownerName" class="block text-sm text-white/60 mt-1">by {{ ownerName }}</span>
                    </p>
                </div>

                <div v-if="!loading && !error && requiresPassword">
                    <form @submit.prevent="handleAccess" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-purple-200 mb-2">Password Required</label>
                            <input v-model="password" type="password" required placeholder="Enter password"
                                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30" />
                        </div>

                        <button type="submit" :disabled="accessing"
                            class="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-purple-900/20">
                            {{ accessing ? 'Accessing...' : 'View Album' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Album Content (Authenticated) -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-8">
            <!-- Header -->
            <div class="pt-4 sm:pt-0 mb-6 sm:mb-8 text-left md:text-left">
                <h1 class="text-4xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{{ albumName }}</h1>
                <div class="text-purple-200 text-base sm:text-base">
                    <span v-if="eventDate">{{ formatDate(eventDate) }}</span>
                    <div v-if="description" class="text-white/60 whitespace-pre-line mt-2">{{ description }}</div>
                    <span v-if="ownerName" class="text-white/40 block mt-2">by {{ ownerName }}</span>
                </div>
            </div>

            <!-- Loading Photos State -->
            <div v-if="loadingPhotos && photos.length === 0" class="text-center py-12">
                <div class="animate-pulse text-purple-300 text-lg sm:text-xl">Loading photos...</div>
            </div>

            <!-- Empty State -->
            <div v-else-if="photos.length === 0" class="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <div class="text-5xl sm:text-6xl mb-4">📷</div>
                <h3 class="text-lg sm:text-xl font-bold text-white mb-2">No photos yet</h3>
            </div>

            <!-- Photo Grid -->
            <div v-else-if="picturesLayout" ref="containerRef" class="relative mx-auto"
                :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                <div v-for="(photo, index) in photos" :key="photo.id" @click="openPhotoViewer(index)"
                    class="absolute cursor-pointer overflow-hidden rounded-lg bg-white/5 border border-white/10 hover:border-purple-400/50 transition-all hover:-translate-y-1 active:scale-95 group"
                    :style="{
                        top: `${picturesLayout.getPosition(index).top}px`,
                        left: `${picturesLayout.getPosition(index).left}px`,
                        width: `${picturesLayout.getPosition(index).width}px`,
                        height: `${picturesLayout.getPosition(index).height}px`,
                    }">
                    <img v-if="photo.blurhash" :src="getBlurhashUrl(photo.blurhash, photo.width, photo.height) || ''"
                        class="absolute inset-0 w-full h-full object-cover" />
                    <img v-if="photo.thumbnailUrl" :src="photo.thumbnailUrl" :alt="photo.filename" loading="lazy"
                        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" />
                    <div v-else
                        class="w-full h-full bg-gradient-to-br from-purple-900/30 to-pink-900/30 flex items-center justify-center relative z-10">
                        <span class="text-3xl sm:text-4xl">📸</span>
                    </div>
                </div>
            </div>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingMore" class="animate-pulse text-purple-300 text-sm sm:text-base">Loading more
                    photos...</div>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
            :has-next="selectedPhotoIndex! < (photos.length || 0) - 1" @close="closePhotoViewer"
            @previous="previousPhoto" @next="nextPhoto" />
    </div>
</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'

interface Photo {
    id: string
    url: string
    thumbnailUrl: string | null
    filename: string
    originalName: string
    size: number
    width: number | null
    height: number | null
    blurhash: string | null
    dateTaken: number | null
    createdAt: number
    uploader: {
        id: string
        name: string | null
    } | null
    // EXIF data
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
}

const route = useRoute()
const token = route.params.token as string

// Auth State
const loading = ref(true)
const error = ref('')
const requiresPassword = ref(false)
const password = ref('')
const accessing = ref(false)
const isAuthenticated = ref(false)

// Album Metadata
const albumId = ref('')
const albumName = ref('')
const ownerName = ref('')
const description = ref('')
const eventDate = ref<number | null>(null)

// Photos State
const photos = ref<Photo[]>([])
const loadingPhotos = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const limit = ref(50)
const hasMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)

// Layout State
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(typeof window !== 'undefined' ? Math.min(1200, window.innerWidth - 32) : 1200)

// Viewer State
const selectedPhotoIndex = ref<number | null>(null)
const selectedPhoto = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    return photos.value[selectedPhotoIndex.value]
})

// Set page title dynamically
useHead({
    title: computed(() => albumName.value ? `${albumName.value} | PicHaus` : 'PicHaus')
})

// Initial Check
onMounted(async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)
        const data = response.data
        albumName.value = data.albumName
        ownerName.value = data.ownerName
        description.value = data.description
        eventDate.value = data.eventDate
        requiresPassword.value = data.requiresPassword

        // Auto-access if no password
        if (!data.requiresPassword) {
            await handleAccess()
        } else {
            loading.value = false
        }
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Invalid or expired link'
        loading.value = false
    }
})

const handleAccess = async () => {
    accessing.value = true
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: {
                token,
                password: password.value,
            }
        })

        albumId.value = response.data.albumId
        isAuthenticated.value = true
        await fetchPhotos()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to access album')
        loading.value = false
    } finally {
        accessing.value = false
    }
}

const fetchPhotos = async () => {
    loadingPhotos.value = true
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId.value}`, {
            params: { page: 1, limit: limit.value }
        })

        if (response.data.photos) {
            photos.value = response.data.photos
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        }
    } catch (err) {
        console.error('Failed to load photos:', err)
    } finally {
        loadingPhotos.value = false
    }
}

const loadMorePhotos = async () => {
    if (loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    try {
        const nextPage = page.value + 1
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId.value}`, {
            params: { page: nextPage, limit: limit.value }
        })

        if (response.data.photos && response.data.photos.length > 0) {
            photos.value = [...photos.value, ...response.data.photos]
            page.value = nextPage
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        } else {
            hasMore.value = false
        }
    } catch (err) {
        console.error('Failed to load more photos:', err)
    } finally {
        loadingMore.value = false
    }
}

// Layout Logic
const picturesLayout = computed(() => {
    if (!photos.value.length) return null

    const aspectRatios = new Float32Array(
        photos.value.map(photo => (photo.width || 1) / (photo.height || 1))
    )

    // Responsive row height based on screen size
    const rowHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 120 : 180

    return new JustifiedLayout(aspectRatios, {
        rowHeight,
        rowWidth: containerWidth.value,
        spacing: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12,
        heightTolerance: 0.1,
    })
})

// Resize Observer
let resizeObserver: ResizeObserver | null = null
watch(containerRef, (el) => {
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }

    if (el) {
        resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    containerWidth.value = entry.contentRect.width
                }
            }
        })
        resizeObserver.observe(el)
    }
})

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect()
    if (infiniteScrollObserver) infiniteScrollObserver.disconnect()
})

// Infinite Scroll
let infiniteScrollObserver: IntersectionObserver | null = null
watch(sentinelRef, (el) => {
    if (infiniteScrollObserver) {
        infiniteScrollObserver.disconnect()
        infiniteScrollObserver = null
    }

    if (el) {
        infiniteScrollObserver = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting && hasMore.value) {
                loadMorePhotos()
            }
        }, { rootMargin: '200px' })
        infiniteScrollObserver.observe(el)
    }
})

// Helpers
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

const getBlurhashUrl = (hash: string | null, width: number | null, height: number | null) => {
    if (!hash || !width || !height) return null
    const w = 32
    const h = Math.round(w * (height / width))
    const pixels = decode(hash, w, h)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const imageData = ctx.createImageData(w, h)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
}

// Viewer Actions
const openPhotoViewer = (index: number) => {
    selectedPhotoIndex.value = index
}

const closePhotoViewer = () => {
    selectedPhotoIndex.value = null
}

const previousPhoto = () => {
    if (selectedPhotoIndex.value !== null && selectedPhotoIndex.value > 0) {
        selectedPhotoIndex.value--
    }
}

const nextPhoto = () => {
    if (selectedPhotoIndex.value !== null && selectedPhotoIndex.value < photos.value.length - 1) {
        selectedPhotoIndex.value++
    }
}
</script>
