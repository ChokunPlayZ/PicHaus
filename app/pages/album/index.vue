<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Navigation Bar -->
        <!-- Navigation Bar -->
        <NavBar title="📸 PicHaus" />

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header with Create Button -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 class="text-3xl font-bold text-white mb-2">My Albums</h2>
                    <p class="text-purple-200">Manage your photo collections</p>
                </div>
                <button @click="showCreateModal = true"
                    class="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition duration-200 transform hover:scale-105 flex items-center justify-center space-x-2">
                    <span>+</span>
                    <span>Create Album</span>
                </button>
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
                    class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                    Create Album
                </button>
            </div>

            <!-- Albums Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="album in albums" :key="album.id"
                    class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:border-purple-400/50 transition cursor-pointer group"
                    @click="navigateTo(`/album/${album.id}`)">
                    <!-- Album Thumbnail -->
                    <div
                        class="aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                        <span class="text-6xl">📸</span>
                    </div>

                    <!-- Album Info -->
                    <div class="p-4">
                        <h3 class="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition">
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
                            class="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ creating ? 'Creating...' : 'Create' }}
                        </button>
                    </div>
                </form>
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
