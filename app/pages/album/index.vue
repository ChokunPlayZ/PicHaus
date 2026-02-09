<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <!-- Navigation Bar -->
        <NavBar title="📸 PicHaus" />

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
            <!-- Header with Actions -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 class="text-3xl font-bold text-white mb-2">My Albums</h2>
                    <p class="text-purple-200">Manage your photo collections</p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button @click="toggleSelectionMode" v-if="albums.length > 0"
                        class="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition duration-200 flex items-center justify-center">
                        {{ isSelectionMode ? 'Cancel Selection' : 'Select Albums' }}
                    </button>
                    <button @click="showCreateModal = true"
                        class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 flex-1 sm:flex-none">
                        <span>+</span>
                        <span>Create Album</span>
                    </button>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="text-center py-12">
                <div class="animate-pulse text-purple-300 text-xl">Loading albums...</div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p class="text-red-200">{{ error }}</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="albums.length === 0" class="text-center py-12">
                <div class="text-6xl mb-4">📷</div>
                <h3 class="text-2xl font-bold text-white mb-2">No albums yet</h3>
                <p class="text-purple-200 mb-6">Create your first album to get started</p>
                <button @click="showCreateModal = true"
                    class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                    Create Album
                </button>
            </div>

            <!-- Albums Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="album in albums" :key="album.id"
                    class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:border-purple-400/50 transition cursor-pointer group relative"
                    :class="{ 'ring-2 ring-purple-500': selectedAlbumIds.has(album.id) }"
                    @click="handleAlbumClick(album)">

                    <!-- Selection Checkbox -->
                    <div v-if="isSelectionMode" class="absolute top-3 right-3 z-10 transition-transform duration-200"
                        :class="selectedAlbumIds.has(album.id) ? 'scale-110' : 'scale-100'">
                        <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            :class="selectedAlbumIds.has(album.id) ? 'border-purple-500 bg-purple-500' : 'border-white/50'">
                            <svg v-if="selectedAlbumIds.has(album.id)" class="w-4 h-4 text-white" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    <!-- Album Thumbnail -->
                    <div class="aspect-video relative bg-gray-900 group-hover:brightness-110 transition duration-300">
                        <!-- Cover Photo -->
                        <img v-if="album.coverPhoto" :src="`/api/assets/${album.coverPhoto.id}/thumb`"
                            class="w-full h-full object-cover" loading="lazy" />

                        <!-- Placeholder if no photo -->
                        <div v-else
                            class="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                            <span class="text-6xl grayscale opacity-50">📷</span>
                        </div>

                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    </div>

                    <!-- Album Info -->
                    <div class="p-4">
                        <h3 class="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition truncate">
                            {{ album.name }}
                        </h3>
                        <p v-if="album.description" class="text-purple-200 text-sm mb-3 line-clamp-2">
                            {{ album.description }}
                        </p>
                        <div class="flex items-center justify-between text-sm text-purple-300">
                            <span>{{ album._count.photos }} photos</span>
                            <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                        </div>
                        <div class="mt-2 text-xs text-purple-400">
                            by {{ album.owner.name }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Selection Action Bar -->
        <div v-if="selectedAlbumIds.size > 0"
            class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40 max-w-[90vw]">
            <div class="text-white font-medium border-r border-white/20 pr-4 whitespace-nowrap">
                {{ selectedAlbumIds.size }} selected
            </div>

            <button @click="clearSelection" class="text-white/60 hover:text-white transition text-sm">
                Clear
            </button>

            <div class="h-6 w-px bg-white/20"></div>

            <button @click="showShareGroupModal = true"
                class="flex items-center gap-2 text-white hover:text-purple-300 transition whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share Group</span>
            </button>
        </div>

        <!-- Create Album Modal -->
        <div v-if="showCreateModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="showCreateModal = false">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <h3 class="text-2xl font-bold text-white mb-4">Create New Album</h3>

                <form @submit.prevent="handleCreateAlbum" class="space-y-4">
                    <!-- Album Name -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Album Name *</label>
                        <input v-model="newAlbum.name" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Summer Vacation 2024" />
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Description</label>
                        <textarea v-model="newAlbum.description" rows="3"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="Tell us about this album..."></textarea>
                    </div>

                    <!-- Event Date -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Event Date</label>
                        <input v-model="newAlbum.eventDate" type="date"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>

                    <!-- Public/Private -->
                    <div class="flex items-center">
                        <input v-model="newAlbum.isPublic" type="checkbox" id="isPublic"
                            class="w-4 h-4 text-purple-600 bg-white/5 border-white/10 rounded focus:ring-purple-500" />
                        <label for="isPublic" class="ml-2 text-sm text-purple-200">Make album public</label>
                    </div>

                    <!-- Error Message -->
                    <div v-if="createError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ createError }}</p>
                    </div>

                    <!-- Buttons -->
                    <div class="flex space-x-3">
                        <button type="button" @click="showCreateModal = false"
                            class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                            Cancel
                        </button>
                        <button type="submit" :disabled="creating"
                            class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ creating ? 'Creating...' : 'Create' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Create Share Group Modal -->
        <div v-if="showShareGroupModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="showShareGroupModal = false">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <h3 class="text-2xl font-bold text-white mb-4">Create Share Group</h3>
                <p class="text-purple-200 text-sm mb-4">Share {{ selectedAlbumIds.size }} albums with a single link.</p>

                <form @submit.prevent="handleCreateShareGroup" class="space-y-4">
                    <!-- Group Title -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Group Title *</label>
                        <input v-model="newShareGroup.title" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="My Portfolio" />
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Description</label>
                        <textarea v-model="newShareGroup.description" rows="3"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="A collection of my best work..."></textarea>
                    </div>

                    <!-- Password (Optional) -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Password (Optional)</label>
                        <input v-model="newShareGroup.password" type="password"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Leave empty for no password" />
                    </div>

                    <!-- Link Label (Optional) -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Link Label (Optional)</label>
                        <input v-model="newShareGroup.label" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. For Family" />
                    </div>

                    <!-- Error Message -->
                    <div v-if="shareGroupError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ shareGroupError }}</p>
                    </div>

                    <!-- Buttons -->
                    <div class="flex space-x-3">
                        <button type="button" @click="showShareGroupModal = false"
                            class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                            Cancel
                        </button>
                        <button type="submit" :disabled="creatingShareGroup"
                            class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ creatingShareGroup ? 'Creating...' : 'Create Link' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Share Link Success Modal -->
        <div v-if="createdShareLink"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="createdShareLink = null">
            <div
                class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full text-center">
                <div
                    class="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Group Link Created!</h3>
                <p class="text-purple-200 mb-6">Your albums are now ready to be shared.</p>

                <div
                    class="bg-white/5 rounded-lg p-4 border border-white/10 mb-6 flex items-center justify-between gap-2">
                    <code class="text-sm text-purple-300 truncate">{{ createdShareLink }}</code>
                    <button @click="copyToClipboard(createdShareLink!)" class="text-white hover:text-purple-300">
                        <span v-if="copied" class="text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>

                <button @click="createdShareLink = null; clearSelection(); isSelectionMode = false"
                    class="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                    Done
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Album {
    id: string
    name: string
    description: string | null
    eventDate: number | null
    isPublic: boolean
    owner: {
        name: string | null
    }
    _count: {
        photos: number
    }
    coverPhoto?: {
        id: string
        blurhash: string | null
    } | null
}

const user = ref<any>(null)
const albums = ref<Album[]>([])
const loading = ref(true)
const error = ref('')

const showCreateModal = ref(false)
const newAlbum = ref({
    name: '',
    description: '',
    eventDate: '',
    isPublic: false,
})
const creating = ref(false)
const createError = ref('')

// Selection & Share Group State
const isSelectionMode = ref(false)
const selectedAlbumIds = ref<Set<string>>(new Set())
const showShareGroupModal = ref(false)
const newShareGroup = ref({
    title: '',
    description: '',
    password: '',
    label: ''
})
const creatingShareGroup = ref(false)
const shareGroupError = ref('')
const createdShareLink = ref<string | null>(null)

// Check authentication
const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
    } catch (err) {
        await navigateTo('/login')
    }
}

// Fetch albums
const fetchAlbums = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: Album[] }>('/api/v1/album')
        albums.value = response.data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to load albums'
    } finally {
        loading.value = false
    }
}

// Selection Logic
const toggleSelectionMode = () => {
    isSelectionMode.value = !isSelectionMode.value
    if (!isSelectionMode.value) {
        clearSelection()
    }
}

const handleAlbumClick = (album: Album) => {
    if (isSelectionMode.value) {
        if (selectedAlbumIds.value.has(album.id)) {
            selectedAlbumIds.value.delete(album.id)
        } else {
            selectedAlbumIds.value.add(album.id)
        }
    } else {
        navigateTo(`/album/${album.id}`)
    }
}

const clearSelection = () => {
    selectedAlbumIds.value.clear()
}

// Create album
const handleCreateAlbum = async () => {
    creating.value = true
    createError.value = ''

    try {
        const eventDate = newAlbum.value.eventDate
            ? Math.floor(new Date(newAlbum.value.eventDate).getTime() / 1000)
            : null

        await $fetch('/api/v1/album/create', {
            method: 'POST',
            body: {
                name: newAlbum.value.name,
                description: newAlbum.value.description || null,
                eventDate,
                isPublic: newAlbum.value.isPublic,
            },
        })

        // Reset form and close modal
        newAlbum.value = { name: '', description: '', eventDate: '', isPublic: false }
        showCreateModal.value = false

        // Refresh albums list
        await fetchAlbums()
    } catch (err: any) {
        createError.value = err.data?.statusMessage || 'Failed to create album'
    } finally {
        creating.value = false
    }
}

// Create Share Group
const handleCreateShareGroup = async () => {
    creatingShareGroup.value = true
    shareGroupError.value = ''

    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/share-group/create', {
            method: 'POST',
            body: {
                title: newShareGroup.value.title,
                description: newShareGroup.value.description || null,
                albumIds: Array.from(selectedAlbumIds.value),
                password: newShareGroup.value.password || undefined,
                label: newShareGroup.value.label || undefined
            }
        })

        showShareGroupModal.value = false
        newShareGroup.value = { title: '', description: '', password: '', label: '' }

        // Show success modal with link
        createdShareLink.value = `${window.location.origin}${response.data.link.url}`
    } catch (err: any) {
        shareGroupError.value = err.data?.statusMessage || 'Failed to create share group'
    } finally {
        creatingShareGroup.value = false
    }
}

const copied = ref(false)

const copyToClipboard = async (text: string) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
        } else {
            // Fallback
            const textArea = document.createElement("textarea")
            textArea.value = text

            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            textArea.style.top = "0"
            document.body.appendChild(textArea)

            textArea.focus()
            textArea.select()

            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)

            if (!successful) {
                throw new Error('Unable to copy')
            }
        }

        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy', err)
        alert('Failed to copy link manually: ' + text)
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

// Initialize
onMounted(async () => {
    await checkAuth()
    await fetchAlbums()
})
</script>
