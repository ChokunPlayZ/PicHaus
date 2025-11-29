<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center min-h-screen">
            <div class="animate-pulse text-purple-300 text-xl">Loading...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-6 max-w-md">
                <h2 class="text-2xl font-bold text-white mb-2">Upload Link Invalid</h2>
                <p class="text-red-200">{{ error }}</p>
            </div>
        </div>

        <!-- Upload Page -->
        <div v-else-if="albumInfo" class="max-w-4xl mx-auto px-4 py-12">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold text-white mb-2">📸 PicHaus</h1>
                <p class="text-purple-200">Upload your photos</p>
            </div>

            <!-- Album Info Card -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-8">
                <h2 class="text-3xl font-bold text-white mb-2">{{ albumInfo.albumName }}</h2>
                <p v-if="albumInfo.description" class="text-purple-200 mb-4">{{ albumInfo.description }}</p>
                <div class="flex items-center space-x-4 text-sm text-purple-300">
                    <span>by {{ albumInfo.ownerName }}</span>
                    <span v-if="albumInfo.eventDate">{{ formatDate(albumInfo.eventDate) }}</span>
                    <span>{{ albumInfo.photoCount }} photos</span>
                </div>
            </div>

            <!-- Upload Area -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 class="text-2xl font-bold text-white mb-6">Upload Your Photos</h3>

                <!-- File Input -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-purple-200 mb-2">Select Photos</label>
                    <input ref="fileInput" type="file" accept="image/*" multiple @change="handleFileSelect"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer" />
                    <p class="text-purple-300 text-sm mt-2">You can select multiple photos at once</p>
                </div>

                <!-- Upload Progress -->
                <div v-if="uploading" class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-white">Uploading {{ uploadProgress.current }} of {{ uploadProgress.total
                            }}...</span>
                        <span class="text-purple-300">{{ Math.round((uploadProgress.current / uploadProgress.total) *
                            100) }}%</span>
                    </div>
                    <div class="w-full bg-white/10 rounded-full h-3">
                        <div class="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300"
                            :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }"></div>
                    </div>
                </div>

                <!-- Success Message -->
                <div v-if="uploadSuccess" class="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                    <p class="text-green-200">✓ Photos uploaded successfully!</p>
                </div>

                <!-- Error Message -->
                <div v-if="uploadError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p class="text-red-200">{{ uploadError }}</p>
                </div>

                <!-- Upload Button -->
                <button v-if="selectedFiles.length > 0 && !uploading" @click="uploadPhotos"
                    class="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition text-lg">
                    Upload {{ selectedFiles.length }} Photo{{ selectedFiles.length > 1 ? 's' : '' }}
                </button>
            </div>

            <!-- Info -->
            <div class="text-center mt-8 text-purple-300 text-sm">
                <p>Your photos will be added to this album</p>
                <p class="mt-2">Powered by PicHaus</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref('')
const albumInfo = ref<any>(null)

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const uploading = ref(false)
const uploadProgress = ref({ current: 0, total: 0 })
const uploadSuccess = ref(false)
const uploadError = ref('')

// Fetch album info
const fetchAlbumInfo = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)
        albumInfo.value = response.data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Invalid or expired upload link'
    } finally {
        loading.value = false
    }
}

// Handle file selection
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (files && files.length > 0) {
        selectedFiles.value = Array.from(files)
        uploadSuccess.value = false
        uploadError.value = ''
    }
}

// Upload photos
const uploadPhotos = async () => {
    if (selectedFiles.value.length === 0) return

    uploading.value = true
    uploadProgress.value = { current: 0, total: selectedFiles.value.length }
    uploadError.value = ''
    uploadSuccess.value = false

    try {
        for (let i = 0; i < selectedFiles.value.length; i++) {
            const file = selectedFiles.value[i]
            const formData = new FormData()
            formData.append('file', file)

            await $fetch(`/api/v1/album/${albumInfo.value.albumId}/upload`, {
                method: 'POST',
                body: formData,
            })

            uploadProgress.value.current = i + 1
        }

        uploadSuccess.value = true
        selectedFiles.value = []

        // Reset file input
        if (fileInput.value) fileInput.value.value = ''

        // Refresh album info to update photo count
        await fetchAlbumInfo()
    } catch (err: any) {
        console.error('Upload error:', err)
        uploadError.value = err.data?.statusMessage || 'Failed to upload photos. Please try again.'
    } finally {
        uploading.value = false
    }
}

// Format date
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

// Initialize
onMounted(async () => {
    await fetchAlbumInfo()
})
</script>
