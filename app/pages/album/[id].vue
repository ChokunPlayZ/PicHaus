<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Navigation Bar -->
        <nav class="bg-white/10 backdrop-blur-lg border-b border-white/20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <button @click="navigateTo('/album')"
                        class="flex items-center space-x-2 text-white hover:text-purple-300 transition">
                        <span>←</span>
                        <span>Back to Albums</span>
                    </button>
                    <div class="flex items-center space-x-4">
                        <span class="text-purple-200">{{ user?.name || 'User' }}</span>
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
            <!-- Album Header -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h1 class="text-4xl font-bold text-white mb-2">{{ album.name }}</h1>
                        <p v-if="album.description" class="text-purple-200 mb-4">{{ album.description }}</p>
                        <div class="flex items-center space-x-4 text-sm text-purple-300">
                            <span>{{ album._count.photos }} photos</span>
                            <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                            <span>by {{ album.owner.name }}</span>
                            <span v-if="album.isPublic"
                                class="px-2 py-1 bg-green-500/20 text-green-300 rounded">Public</span>
                            <span v-else class="px-2 py-1 bg-gray-500/20 text-gray-300 rounded">Private</span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex space-x-2">
                        <button v-if="album.permissions.canEdit" @click="showEditModal = true"
                            class="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition">
                            Edit
                        </button>
                        <button v-if="album.permissions.canDelete" @click="confirmDelete"
                            class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">
                            Delete
                        </button>
                        <button @click="copyUploadLink"
                            class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg transition">
                            {{ copied ? 'Copied!' : 'Share Upload Link' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Photos Section -->
            <div class="mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-white">Photos</h2>
                    <button v-if="album.permissions.canEdit" @click="triggerFileInput"
                        class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition flex items-center space-x-2">
                        <span>+</span>
                        <span>Upload Photos</span>
                    </button>
                </div>

                <!-- Hidden file input -->
                <input ref="fileInput" type="file" accept="image/*" multiple @change="handleFileSelect"
                    class="hidden" />

                <!-- Upload Progress -->
                <div v-if="uploading" class="mb-4 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-white">Uploading {{ uploadProgress.current }} of {{ uploadProgress.total
                            }}...</span>
                        <span class="text-purple-300">{{ Math.round((uploadProgress.current / uploadProgress.total) *
                            100) }}%</span>
                    </div>
                    <div class="w-full bg-white/10 rounded-full h-2">
                        <div class="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                            :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }"></div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="album.photos.length === 0 && !uploading"
                    class="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-6xl mb-4">📷</div>
                    <h3 class="text-xl font-bold text-white mb-2">No photos yet</h3>
                    <p class="text-purple-200 mb-4">Upload photos or share the upload link</p>
                    <button @click="copyUploadLink"
                        class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                        Get Upload Link
                    </button>
                </div>

                <!-- Photo Grid -->
                <div v-else-if="album.photos.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div v-for="photo in album.photos" :key="photo.id"
                        class="aspect-square bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:border-purple-400/50 transition cursor-pointer group">
                        <img v-if="photo.thumbnailUrl" :src="photo.thumbnailUrl" :alt="photo.filename"
                            class="w-full h-full object-cover" />
                        <div v-else
                            class="w-full h-full bg-gradient-to-br from-purple-900/30 to-pink-900/30 flex items-center justify-center">
                            <span class="text-4xl">📸</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Collaborators Section -->
            <div v-if="album.collaborators.length > 0">
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
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const albumId = route.params.id as string

const user = ref(null)
const album = ref(null)
const loading = ref(true)
const error = ref('')

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

// Check authentication
const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
    } catch (err) {
        await navigateTo('/login')
    }
}

// Fetch album
const fetchAlbum = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}`)
        album.value = response.data

        // Populate edit form
        editForm.value = {
            name: album.value.name,
            description: album.value.description || '',
            eventDate: album.value.eventDate ? new Date(album.value.eventDate * 1000).toISOString().split('T')[0] : '',
            isPublic: album.value.isPublic,
        }
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to load album'
    } finally {
        loading.value = false
    }
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

// Copy upload link
const copyUploadLink = async () => {
    const link = `${window.location.origin}/upload/${album.value.uploadLinkToken}`
    await navigator.clipboard.writeText(link)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
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

// Initialize
onMounted(async () => {
    await checkAuth()
    await fetchAlbum()
})
</script>
