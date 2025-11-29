<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Navigation Bar -->
        <nav v-if="album && (album.permissions.isOwner || album.permissions.canEdit)"
            class="bg-white/10 backdrop-blur-lg border-b border-white/20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <button @click="navigateTo('/album')"
                        class="flex items-center space-x-2 text-white hover:text-purple-300 transition">
                        <span>←</span>
                        <span>Back to Albums</span>
                    </button>
                    <div class="flex items-center space-x-4">
                        <span class="text-purple-200">{{ user?.name }}</span>
                        <button @click="handleLogout"
                            class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Loading State -->
        <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <div class="animate-pulse text-purple-300 text-xl">Loading album...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p class="text-red-200">{{ error }}</p>
            </div>
        </div>

        <!-- Album Content -->
        <div v-else-if="album" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 class="text-4xl font-bold text-white mb-2">{{ album.name }}</h1>
                    <div class="text-purple-200">
                        <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                        <div v-if="album.description" class="text-white/60 whitespace-pre-line mt-2">{{
                            album.description }}</div>
                        <span v-if="album.isPublic"
                            class="inline-block mt-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs border border-green-500/30">Public</span>
                    </div>
                </div>

                <div class="flex flex-wrap gap-3 w-full md:w-auto">
                    <!-- Share Button -->
                    <button v-if="album.permissions.isOwner" @click="openShareModal"
                        class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center gap-2">
                        <span>Share</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>

                    <!-- Download All Button -->
                    <button v-if="album.permissions.isOwner || album.permissions.canEdit" @click="downloadAll"
                        :disabled="downloading"
                        class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center gap-2 disabled:opacity-50">
                        <span v-if="downloading">
                            {{ downloadProgress.current }}/{{ downloadProgress.total }}
                        </span>
                        <span v-else>Download All</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>

                    <template v-if="album.permissions.canEdit">
                        <button @click="showEditModal = true"
                            class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition whitespace-nowrap">
                            Edit Album
                        </button>
                        <button @click="confirmDelete"
                            class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition whitespace-nowrap">
                            Delete
                        </button>
                    </template>
                </div>
            </div>

            <!-- Upload Section -->
            <div v-if="album.permissions.canEdit" class="mb-8">
                <div @click="triggerFileInput" @dragover.prevent @drop.prevent="handleFileSelect"
                    class="border-2 border-dashed border-white/20 rounded-xl p-4 sm:p-8 text-center hover:border-purple-500/50 hover:bg-white/5 transition cursor-pointer group">
                    <input type="file" ref="fileInput" multiple accept="image/*" class="hidden"
                        @change="handleFileSelect" />
                    <div
                        class="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-400" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Upload Photos</h3>
                    <p class="text-white/60">Drag & drop photos here or click to browse</p>
                </div>

                <!-- Upload Progress -->
                <div v-if="uploading" class="mt-4 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-white">Uploading {{ uploadProgress.current }} of {{ uploadProgress.total
                        }}...</span>
                        <span class="text-purple-300">{{ Math.round((uploadProgress.current / uploadProgress.total) *
                            100)
                        }}%</span>
                    </div>
                    <div class="w-full bg-white/10 rounded-full h-2">
                        <div class="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                            :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="photos.length === 0 && !uploading"
                class="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <div class="text-6xl mb-4">📷</div>
                <h3 class="text-xl font-bold text-white mb-2">No photos yet</h3>
                <p class="text-purple-200 mb-4">Upload photos to get started</p>
                <button v-if="album.permissions.isOwner" @click="openShareModal"
                    class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                    Share Album
                </button>
            </div>

            <!-- Photo Grid -->
            <div v-else-if="picturesLayout" ref="containerRef" class="relative"
                :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                <div v-for="(photo, index) in photos" :key="photo.id" @click="openPhotoViewer(index)"
                    class="absolute cursor-pointer overflow-hidden rounded-lg bg-white/5 border border-white/10 hover:border-purple-400/50 transition-transform hover:-translate-y-1 group"
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
                        <span class="text-4xl">📸</span>
                    </div>
                </div>
            </div>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingPhotos" class="animate-pulse text-purple-300">Loading more photos...</div>
            </div>
        </div>

        <!-- Collaborators Section -->
        <div v-if="album?.collaborators && album.collaborators.length > 0 && album.permissions.isOwner">
            <h2 class="text-2xl font-bold text-white mb-4">Collaborators</h2>
            <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
                <div v-for="collab in album.collaborators" :key="collab.id"
                    class="flex items-center justify-between py-2">
                    <div>
                        <p class="text-white font-medium">{{ collab.user.name }}</p>
                        <p class="text-purple-300 text-sm">{{ collab.user.email }}</p>
                    </div>
                    <span class="px-3 py-1 bg-purple-500/20 text-purple-200 rounded-full text-sm">{{ collab.role
                        }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Album Modal -->
    <div v-if="showEditModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="showEditModal = false">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <h3 class="text-2xl font-bold text-white mb-4">Edit Album</h3>

            <form @submit.prevent="handleUpdateAlbum" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Album Name *</label>
                    <input v-model="editForm.name" type="text" required
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Description</label>
                    <textarea v-model="editForm.description" rows="3"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Event Date</label>
                    <input v-model="editForm.eventDate" type="date"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <div class="flex items-center">
                    <input v-model="editForm.isPublic" type="checkbox" id="editIsPublic"
                        class="w-4 h-4 text-purple-600 bg-white/5 border-white/10 rounded focus:ring-purple-500" />
                    <label for="editIsPublic" class="ml-2 text-sm text-purple-200">Make album public</label>
                </div>

                <div v-if="editError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p class="text-red-200 text-sm">{{ editError }}</p>
                </div>

                <div class="flex space-x-3">
                    <button type="button" @click="showEditModal = false"
                        class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Cancel
                    </button>
                    <button type="submit" :disabled="updating"
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ updating ? 'Updating...' : 'Update' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="showShareModal = false">
        <div
            class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-white">Share Album</h3>
                <button @click="showShareModal = false" class="text-white/60 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Create New Link -->
            <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <h4 class="text-lg font-semibold text-white mb-4">Create New Link</h4>
                <form @submit.prevent="createShareLink" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-purple-200 mb-2">Type</label>
                            <select v-model="newLink.type"
                                class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="view">View Only</option>
                                <option value="upload">Allow Uploads</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-purple-200 mb-2">Label (Optional)</label>
                            <input v-model="newLink.label" type="text" placeholder="e.g. Family Group"
                                class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Password (Optional)</label>
                        <input v-model="newLink.password" type="password" placeholder="Leave empty for no password"
                            class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <button type="submit" :disabled="creatingLink"
                        class="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ creatingLink ? 'Creating...' : 'Create Link' }}
                    </button>
                </form>
            </div>

            <!-- Existing Links -->
            <div>
                <h4 class="text-lg font-semibold text-white mb-4">Active Links</h4>
                <div v-if="loadingLinks" class="text-center py-4 text-purple-300">Loading links...</div>
                <div v-else-if="shareLinks.length === 0" class="text-center py-4 text-white/50">
                    No active share links.
                </div>
                <div v-else class="space-y-3">
                    <div v-for="link in shareLinks" :key="link.id"
                        class="bg-white/5 rounded-lg p-4 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-medium text-white">{{ link.label || 'Untitled Link' }}</span>
                                <span :class="{
                                    'bg-blue-500/20 text-blue-300': link.type === 'view',
                                    'bg-green-500/20 text-green-300': link.type === 'upload'
                                }" class="px-2 py-0.5 rounded text-xs uppercase border border-white/10">
                                    {{ link.type }}
                                </span>
                                <span v-if="link.password" class="text-xs text-yellow-300 flex items-center gap-1">
                                    🔒 Password
                                </span>
                            </div>
                            <div class="flex items-center gap-2 text-sm">
                                <button @click="copyLink(link)"
                                    class="truncate max-w-[200px] text-white/60 hover:text-purple-300 transition underline decoration-dotted">
                                    {{ getShareUrl(link) }}
                                </button>
                                <button @click="copyLink(link)" :class="[
                                    'px-2 py-1 rounded transition text-xs font-medium',
                                    link.copied ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                                ]">
                                    {{ link.copied ? '✓ Copied!' : 'Copy' }}
                                </button>
                            </div>
                            <div class="text-xs text-white/40 mt-1">
                                Created {{ formatDate(link.createdAt) }} • {{ link.views }} views
                            </div>
                        </div>
                        <button @click="deleteLink(link.id)"
                            class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Photo Viewer -->
    <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
        :has-next="selectedPhotoIndex! < (photos.length || 0) - 1" @close="closePhotoViewer" @previous="previousPhoto"
        @next="nextPhoto" />

</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface User {
    id: string
    name: string | null
    email: string | null
    instagram: string | null
}

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

interface Collaborator {
    id: string
    role: string
    user: {
        id: string
        name: string | null
        email: string | null
    }
    createdAt: number
}

interface Permissions {
    isOwner: boolean
    isCollaborator: boolean
    canEdit: boolean
    canDelete: boolean
}

interface Album {
    id: string
    name: string
    description: string | null
    eventDate: number | null
    isPublic: boolean
    owner: User
    photos: Photo[]
    collaborators: Collaborator[]
    _count: {
        photos: number
        collaborators: number
    }
    permissions: Permissions
}

interface ShareLink {
    id: string
    token: string
    type: 'view' | 'upload'
    label: string | null
    password: boolean // Backend returns boolean if password exists
    views: number
    createdAt: number
    copied?: boolean
}

const route = useRoute()
const albumId = route.params.id as string

const user = ref<User | null>(null)
const album = ref<Album | null>(null)
const loading = ref(true)
const error = ref('')

// Pagination state
const page = ref(1)
const limit = ref(50)
const hasMore = ref(false)
const loadingPhotos = ref(false)
const photos = ref<Photo[]>([])
const sentinelRef = ref<HTMLElement | null>(null)

const showEditModal = ref(false)
const editForm = ref({
    name: '',
    description: '',
    eventDate: '',
    isPublic: false,
})
const updating = ref(false)
const editError = ref('')

const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadProgress = ref({ current: 0, total: 0 })
const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })

const selectedPhotoIndex = ref<number | null>(null)
const selectedPhoto = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    return photos.value[selectedPhotoIndex.value]
})

// Set page title dynamically
useHead({
    title: computed(() => album.value?.name ? `${album.value.name} | PicHaus` : 'PicHaus')
})

// Share Modal State
const showShareModal = ref(false)
const shareLinks = ref<ShareLink[]>([])
const loadingLinks = ref(false)
const creatingLink = ref(false)
const newLink = ref({
    type: 'view',
    label: '',
    password: ''
})

// Layout state
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(typeof window !== 'undefined' ? Math.min(1200, window.innerWidth - 64) : 1200)

// Computed layout
const picturesLayout = computed(() => {
    if (!photos.value.length) return null

    // Check for missing dimensions
    const missingDims = photos.value.filter(p => !p.width || !p.height)
    if (missingDims.length > 0) {
        console.warn(`Layout warning: ${missingDims.length} photos missing dimensions. Defaulting to 1:1 aspect ratio.`)
    }

    const aspectRatios = new Float32Array(
        photos.value.map(photo => (photo.width || 1) / (photo.height || 1))
    )

    return new JustifiedLayout(aspectRatios, {
        rowHeight: 180,
        rowWidth: containerWidth.value,
        spacing: 12,
        heightTolerance: 0.1,
    })
})

// Resize observer
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
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
})

// Check authentication (don't redirect if failed, just set user to null)
const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
    } catch (err) {
        user.value = null
    }
}

// Fetch album (initial load)
const fetchAlbum = async () => {
    try {
        loading.value = true
        page.value = 1
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}`, {
            params: { page: page.value, limit: limit.value }
        })
        album.value = response.data

        if (response.data.photos) {
            photos.value = response.data.photos
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        }

        // Populate edit form
        if (album.value) {
            editForm.value = {
                name: album.value.name,
                description: album.value.description ?? '',
                eventDate: album.value.eventDate ? (new Date(album.value.eventDate * 1000).toISOString().split('T')[0] ?? '') : '',
                isPublic: album.value.isPublic,
            }
        }
    } catch (err: any) {
        // If 403 and not logged in, redirect to login
        if (err.statusCode === 403 && !user.value) {
            return navigateTo(`/login?redirect=${route.fullPath}`)
        }
        error.value = err.data?.statusMessage || 'Failed to load album'
    } finally {
        loading.value = false
    }
}

// Copy album link
const copyAlbumLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
}

// Load more photos
const loadMorePhotos = async () => {
    if (loadingPhotos.value || !hasMore.value) return

    loadingPhotos.value = true
    try {
        const nextPage = page.value + 1
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}`, {
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
        loadingPhotos.value = false
    }
}

// Infinite scroll observer
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

// Blurhash utility
const getBlurhashUrl = (hash: string | null, width: number | null, height: number | null) => {
    if (!hash || !width || !height) return null

    // Use smaller dimensions for blurhash to improve performance
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

// Update album
const handleUpdateAlbum = async () => {
    updating.value = true
    editError.value = ''

    try {
        const eventDate = editForm.value.eventDate
            ? Math.floor(new Date(editForm.value.eventDate).getTime() / 1000)
            : null

        await $fetch(`/api/v1/album/${albumId}`, {
            method: 'PATCH',
            body: {
                name: editForm.value.name,
                description: editForm.value.description || null,
                eventDate,
                isPublic: editForm.value.isPublic,
            },
        })

        showEditModal.value = false
        // Refresh album details but keep photos if possible, or reload
        // For simplicity, reload first page
        await fetchAlbum()
    } catch (err: any) {
        editError.value = err.data?.statusMessage || 'Failed to update album'
    } finally {
        updating.value = false
    }
}

// Delete album
const confirmDelete = async () => {
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
        return
    }

    try {
        await $fetch(`/api/v1/album/${albumId}`, { method: 'DELETE' })
        await navigateTo('/album')
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete album')
    }
}

// Share Logic
const openShareModal = async () => {
    showShareModal.value = true
    await fetchShareLinks()
}

const fetchShareLinks = async () => {
    loadingLinks.value = true
    try {
        const response = await $fetch<{ success: boolean; data: ShareLink[] }>(`/api/v1/album/${albumId}/share-links`)
        shareLinks.value = response.data
    } catch (err) {
        console.error('Failed to fetch share links:', err)
    } finally {
        loadingLinks.value = false
    }
}

const createShareLink = async () => {
    creatingLink.value = true
    try {
        await $fetch(`/api/v1/album/${albumId}/share-links`, {
            method: 'POST',
            body: newLink.value
        })
        newLink.value = { type: 'view', label: '', password: '' }
        await fetchShareLinks()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to create link')
    } finally {
        creatingLink.value = false
    }
}

const deleteLink = async (id: string) => {
    if (!confirm('Delete this link? Users will no longer be able to access it.')) return
    try {
        await $fetch(`/api/v1/share-links/${id}`, { method: 'DELETE' })
        await fetchShareLinks()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete link')
    }
}

const getShareUrl = (link: ShareLink) => {
    if (link.type === 'upload') {
        return `${window.location.origin}/u/${link.token}`
    }
    return `${window.location.origin}/v/${link.token}`
}

const copyLink = async (link: ShareLink) => {
    const url = getShareUrl(link)

    try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url)
        } else {
            // Fallback for mobile devices or older browsers
            const textArea = document.createElement('textarea')
            textArea.value = url
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()

            try {
                document.execCommand('copy')
            } catch (err) {
                console.error('Fallback copy failed:', err)
            }

            document.body.removeChild(textArea)
        }

        link.copied = true
        setTimeout(() => link.copied = false, 2000)
    } catch (err) {
        console.error('Failed to copy link:', err)
        alert('Failed to copy link. Please copy manually: ' + url)
    }
}

// Download all photos
const downloadAll = async () => {
    if (downloading.value) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: 0 }

    try {
        // Fetch all photo URLs
        const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId}/download-info`)
        const photosToDownload = response.data

        if (photosToDownload.length === 0) {
            alert('No photos to download')
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const zip = new JSZip()
        const folder = zip.folder(album.value?.name || 'album')

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(photo.url)
                const blob = await res.blob()
                folder?.file(photo.originalName, blob)
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        })

        await Promise.all(promises)

        // Generate zip
        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            // We could also track zip generation progress here if we wanted
            // but file download is usually the bottleneck
        })
        saveAs(content, `${album.value?.name || 'album'}.zip`)
    } catch (err) {
        console.error('Download all error:', err)
        alert('Failed to download photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

// Trigger file input
const triggerFileInput = () => {
    fileInput.value?.click()
}

// Handle file selection
const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (!files || files.length === 0) return

    uploading.value = true
    uploadProgress.value = { current: 0, total: files.length }

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (!file) continue

            const formData = new FormData()
            formData.append('file', file)

            await $fetch(`/api/v1/album/${albumId}/upload`, {
                method: 'POST',
                body: formData,
            })

            uploadProgress.value.current = i + 1
        }

        // Refresh album to show new photos
        await fetchAlbum()

        // Reset file input
        if (target) target.value = ''
    } catch (err: any) {
        console.error('Upload error:', err)
        alert(err.data?.statusMessage || 'Failed to upload photos')
    } finally {
        uploading.value = false
        uploadProgress.value = { current: 0, total: 0 }
    }
}

// Logout
const handleLogout = async () => {
    try {
        await $fetch('/api/v1/auth/logout', { method: 'POST' })
        await navigateTo('/login')
    } catch (err) {
        console.error('Logout error:', err)
    }
}

// Format date
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

const openPhotoViewer = (index: number) => {
    selectedPhotoIndex.value = index
}

const closePhotoViewer = () => {
    selectedPhotoIndex.value = null
}

const nextPhoto = () => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return
    if (selectedPhotoIndex.value < photos.value.length - 1) {
        selectedPhotoIndex.value++
    }
}

const previousPhoto = () => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return
    if (selectedPhotoIndex.value > 0) {
        selectedPhotoIndex.value--
    }
}

// Initialize
onMounted(async () => {
    await checkAuth()
    await fetchAlbum()
})
</script>
