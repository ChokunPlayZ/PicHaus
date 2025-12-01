<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
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
                            class="w-full px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-[var(--shadow-secondary)]">
                            {{ accessing ? 'Accessing...' : 'View Album' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Album Content (Authenticated) -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-8">
            <!-- Header -->
            <!-- Header -->
            <div
                class="pt-4 sm:pt-0 mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="text-left md:text-left">
                    <h1 class="text-4xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{{ albumName }}</h1>
                    <div class="text-purple-200 text-base sm:text-base">
                        <span v-if="eventDate">{{ formatDate(eventDate) }}</span>
                        <div v-if="description" class="text-white/60 whitespace-pre-line mt-2">{{ description }}</div>
                        <div v-if="photographers.length > 0" class="flex items-center gap-2 mt-2">
                            <span class="text-white/40">by</span>
                            <button @click="showPhotographersModal = true"
                                class="text-white/80 hover:text-white transition underline decoration-dotted">
                                {{ photographersDisplay }}
                            </button>
                        </div>
                    </div>
                </div>

                <button @click="downloadAll" :disabled="downloading"
                    class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap">
                    <span>Download All</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
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
                    <img :src="`/api/assets/${photo.id}/thumb`" :alt="photo.filename" loading="lazy"
                        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" />
                </div>
            </div>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingMore" class="animate-pulse text-purple-300 text-sm sm:text-base">Loading more
                    photos...</div>
            </div>
        </div>

        <!-- Photographers Modal -->
        <div v-if="showPhotographersModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="showPhotographersModal = false">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold text-white">Photographers</h3>
                    <button @click="showPhotographersModal = false" class="text-white/60 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="space-y-3">
                    <div v-for="photographer in photographers" :key="photographer.id"
                        class="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1">
                                <p class="text-white font-medium">{{ photographer.name }}</p>
                                <p v-if="photographer.email" class="text-purple-300 text-sm">{{ photographer.email }}
                                </p>
                                <div v-if="photographer.instagram" class="flex items-center gap-2 mt-1">
                                    <span class="text-purple-300 text-sm">@{{ photographer.instagram }}</span>
                                    <a :href="`https://instagram.com/${photographer.instagram || ''}`" target="_blank"
                                        rel="noopener noreferrer" class="text-pink-400 hover:text-pink-300 transition">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path
                                                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                            <span
                                class="px-2 py-1 bg-purple-500/20 text-purple-200 rounded-full text-xs whitespace-nowrap">
                                {{ photographer.role }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Download Progress Modal -->
        <div v-if="downloading"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-sm w-full shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-4 text-center">Downloading Photos</h3>

                <div class="mb-2 flex justify-between text-sm text-purple-200">
                    <span>Progress</span>
                    <span>{{ Math.round((downloadProgress.current / downloadProgress.total) * 100) }}%</span>
                </div>

                <div class="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-[#f9d4e0] to-[#b0ace8] h-full transition-all duration-300 ease-out"
                        :style="{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }">
                    </div>
                </div>

                <p class="text-center text-white/60 text-sm">
                    {{ downloadProgress.current }} of {{ downloadProgress.total }} files processed
                </p>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
            :has-next="selectedPhotoIndex! < (photos.length || 0) - 1" :previous-photo-id="previousPhotoId"
            :next-photo-id="nextPhotoId" @close="closePhotoViewer" @previous="previousPhoto" @next="nextPhoto" />
    </div>
</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface Photo {
    id: string

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

// Download State
const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })

// Photographers modal state
const showPhotographersModal = ref(false)
const photographers = ref<Array<{
    id: string
    name: string
    email: string | null
    instagram: string | null
    role: string
}>>([])

// Computed: Display text for photographers (first names only)
const photographersDisplay = computed(() => {
    return photographers.value
        .map(p => p.name.split(' ')[0]) // Get first name only
        .join(', ')
})

// Download all photos
const downloadAll = async () => {
    if (downloading.value) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: 0 }

    try {
        // Fetch all photo URLs
        const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId.value}/download-info`)
        const photosToDownload = response.data

        if (photosToDownload.length === 0) {
            alert('No photos to download')
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const zip = new JSZip()
        const folder = zip.folder(albumName.value || 'album')

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/${photo.id}/full`)
                const blob = await res.blob()
                folder?.file(photo.originalName, blob)
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        })

        await Promise.all(promises)

        // Generate zip
        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, `${albumName.value || 'album'}.zip`)
    } catch (err) {
        console.error('Download all error:', err)
        alert('Failed to download photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

// Viewer State
const selectedPhotoIndex = ref<number | null>(null)
const selectedPhoto = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    return photos.value[selectedPhotoIndex.value]
})

// Computed: Adjacent photo IDs for preloading
const previousPhotoId = computed(() => {
    if (selectedPhotoIndex.value === null || selectedPhotoIndex.value <= 0) return null
    return photos.value[selectedPhotoIndex.value - 1]?.id || null
})

const nextPhotoId = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    if (selectedPhotoIndex.value >= photos.value.length - 1) return null
    return photos.value[selectedPhotoIndex.value + 1]?.id || null
})

// Initial Data Fetch (SSR)
const { data: linkData, error: linkError } = await useFetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)

// Populate state from SSR data
if (linkData.value?.data) {
    const data = linkData.value.data
    albumId.value = data.albumId
    albumName.value = data.albumName
    ownerName.value = data.ownerName
    description.value = data.description
    eventDate.value = data.eventDate
    requiresPassword.value = data.requiresPassword



    loading.value = false
} else if (linkError.value) {
    error.value = linkError.value.data?.statusMessage || 'Invalid or expired link'
    loading.value = false
}

// Set page title and SEO meta
useSeoMeta({
    title: computed(() => albumName.value ? `${albumName.value} | PicHaus` : 'PicHaus'),
    ogTitle: computed(() => albumName.value),
    description: computed(() => description.value || `View ${albumName.value || 'album'} on PicHaus`),
    ogDescription: computed(() => description.value || `View ${albumName.value || 'album'} on PicHaus`),
    ogImage: computed(() => albumId.value ? `/api/v1/album/${albumId.value}/og-image` : null),
    twitterCard: 'summary_large_image',
    twitterImage: computed(() => albumId.value ? `/api/v1/album/${albumId.value}/og-image` : null),
})

// Auto-access if no password (Client-side only)
onMounted(async () => {
    if (linkData.value?.data && !linkData.value.data.requiresPassword && !isAuthenticated.value) {
        await handleAccess()
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

// Fetch photos after access
const fetchPhotos = async () => {
    try {
        loadingPhotos.value = page.value === 1
        loadingMore.value = page.value > 1

        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId.value}?page=${page.value}&limit=${limit.value}`)

        // Populate photographers from album data (only once)
        if (page.value === 1 && response.data) {
            const photographersMap = new Map()

            // Add owner
            const owner = response.data.owner
            if (owner) {
                photographersMap.set(owner.id, {
                    id: owner.id,
                    name: owner.name || owner.email || 'Unknown',
                    email: owner.email,
                    instagram: owner.instagram || null,
                    role: 'Owner'
                })
            }

            // Add collaborators
            response.data.collaborators?.forEach((collab: any) => {
                const user = collab.user
                if (!photographersMap.has(user.id)) {
                    photographersMap.set(user.id, {
                        id: user.id,
                        name: user.name || user.email || 'Unknown',
                        email: user.email,
                        instagram: user.instagram || null,
                        role: 'Collaborator'
                    })
                }
            })

            photographers.value = Array.from(photographersMap.values())
        }

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
