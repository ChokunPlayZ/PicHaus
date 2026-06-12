<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center min-h-screen">
            <div class="w-10 h-10 rounded-full border-2 animate-spin"
                style="border-color: var(--separator); border-top-color: var(--accent);"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center min-h-screen p-4">
            <div class="rounded-2xl p-6 max-w-md w-full"
                style="background: var(--error-bg); border: 1px solid var(--error-border);">
                <h2 class="text-xl font-bold mb-2" style="color: var(--error-text);">Upload Link Invalid</h2>
                <p class="text-sm" style="color: var(--error-text); opacity: 0.8;">{{ error }}</p>
            </div>
        </div>

        <!-- Guest Login -->
        <div v-else-if="!isLoggedIn && albumInfo" class="max-w-md mx-auto px-4 py-12">
            <div class="text-center mb-8">
                <img v-if="albumInfo?.logoImageId" :src="`/api/assets/logo/${albumInfo.logoImageId}`" alt="Logo"
                    class="h-16 max-w-[200px] object-contain mx-auto mb-2" />
                <h1 v-else class="text-4xl font-bold mb-2" style="color: var(--text-1);">{{ albumInfo?.logoText || '📸 PicHaus' }}</h1>
                <p class="text-sm" style="color: var(--text-2);">Join to upload photos</p>
            </div>

            <div class="rounded-2xl p-8"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-md);">
                <h2 class="text-xl font-bold mb-1" style="color: var(--text-1);">{{ albumInfo.albumName }}</h2>
                <p class="text-sm mb-6" style="color: var(--text-2);">Please identify yourself to contribute</p>

                <form @submit.prevent="handleGuestLogin" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="guestForm.name" type="text" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Your Name"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="guestForm.email" type="email" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="your@email.com"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div v-if="albumInfo.requiresPassword">
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Album Password</label>
                        <input v-model="guestForm.password" type="password" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Enter album password"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <div v-if="loginError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ loginError }}
                    </div>

                    <button type="submit" :disabled="loggingIn"
                        class="w-full py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!loggingIn && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ loggingIn ? 'Joining…' : 'Join Album' }}
                    </button>
                    <button type="button" @click="goToLogin"
                        class="w-full py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Have an account? Sign in
                    </button>
                </form>
            </div>
        </div>

        <!-- Upload Page -->
        <div v-else class="max-w-4xl mx-auto px-4 py-12">
            <!-- Header -->
            <div class="text-center mb-8">
                <img v-if="albumInfo?.logoImageId" :src="`/api/assets/logo/${albumInfo.logoImageId}`" alt="Logo"
                    class="h-16 max-w-[200px] object-contain mx-auto mb-2" />
                <h1 v-else class="text-4xl font-bold mb-2" style="color: var(--text-1);">{{ albumInfo?.logoText || '📸 PicHaus' }}</h1>
                <p class="text-sm" style="color: var(--text-2);">Upload your photos</p>
                <p class="text-xs mt-1" style="color: var(--text-3);">Logged in as {{ user?.name }}</p>
            </div>

            <!-- Album Info Card -->
            <div class="rounded-2xl p-6 mb-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <h2 class="text-2xl font-bold mb-1" style="color: var(--text-1);">{{ albumInfo.albumName }}</h2>
                <p v-if="albumInfo.description" class="text-sm mb-3" style="color: var(--text-2);">{{ albumInfo.description }}</p>
                <div class="flex items-center gap-4 text-sm" style="color: var(--text-3);">
                    <span>by {{ albumInfo.ownerName }}</span>
                    <span v-if="albumInfo.eventDate">{{ formatDate(albumInfo.eventDate) }}</span>
                    <span>{{ albumInfo.photoCount }} photos</span>
                </div>
            </div>

            <!-- Upload Area -->
            <div class="rounded-2xl p-8"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <h3 class="text-xl font-bold mb-6" style="color: var(--text-1);">Upload Your Photos</h3>

                <!-- File Input -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Select Photos</label>
                    <input ref="fileInput" type="file" accept="image/*" multiple @change="handleFileSelect"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl cursor-pointer"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1);" />
                    <p class="text-xs mt-1.5" style="color: var(--text-3);">You can select multiple photos at once</p>
                </div>

                <!-- Upload Progress -->
                <div v-if="uploading" class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm" style="color: var(--text-1);">Uploading {{ uploadProgress.current }} of {{ uploadProgress.total }}…</span>
                        <span class="text-sm font-medium" style="color: var(--accent);">{{ Math.round((uploadProgress.current / uploadProgress.total) * 100) }}%</span>
                    </div>
                    <div class="w-full rounded-full h-2" style="background: var(--surface-3);">
                        <div class="h-2 rounded-full transition-all duration-300"
                            style="background: var(--accent);"
                            :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }"></div>
                    </div>
                </div>

                <!-- Success -->
                <div v-if="uploadSuccess" class="rounded-xl px-4 py-3 text-sm mb-4"
                    style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text);">
                    Photos uploaded successfully!
                </div>

                <!-- Error -->
                <div v-if="uploadError" class="rounded-xl px-4 py-3 text-sm mb-4"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ uploadError }}
                </div>

                <!-- Warning -->
                <div v-if="uploadWarning" class="rounded-xl px-4 py-3 text-sm mb-4"
                    style="background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning-text);">
                    {{ uploadWarning }}
                </div>

                <!-- Upload Button -->
                <button v-if="selectedFiles.length > 0 && !uploading" @click="uploadPhotos"
                    class="w-full py-3 rounded-full text-base font-semibold transition"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    Upload {{ selectedFiles.length }} Photo{{ selectedFiles.length > 1 ? 's' : '' }}
                </button>
            </div>

            <div class="text-center mt-8 text-sm" style="color: var(--text-3);">
                <p>Your photos will be added to this album</p>
                <p class="mt-1">Powered by PicHaus</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getAuthToken, setAuthToken } from '~/utils/auth-client'

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref('')
const albumInfo = ref<any>(null)
const isLoggedIn = ref(false)
const user = ref<any>(null)

// Guest login form
const guestForm = ref({
    name: '',
    email: '',
    password: '',
})
const loggingIn = ref(false)
const loginError = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const uploading = ref(false)
const uploadProgress = ref({ current: 0, total: 0 })
const uploadSuccess = ref(false)
const uploadError = ref('')
const uploadWarning = ref('')

// Helper to calculate SHA-256 hash
const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Check auth
const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
        isLoggedIn.value = true
    } catch (err) {
        isLoggedIn.value = false
    }
}

// Fetch album info
const fetchAlbumInfo = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)
        const data = response.data
        const isUploadLink = data.shareType === 'upload' || data.type === 'upload'

        if (!isUploadLink) {
            error.value = 'This link is not for uploading.'
            albumInfo.value = null
            return
        }

        albumInfo.value = data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Invalid or expired upload link'
    } finally {
        loading.value = false
    }
}

// Handle guest login
const handleGuestLogin = async () => {
    loggingIn.value = true
    loginError.value = ''

    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: {
                token,
                name: guestForm.value.name,
                email: guestForm.value.email,
                password: guestForm.value.password,
            },
        })

        if (response.data?.accessToken) {
            setAuthToken(response.data.accessToken)
        }

        albumInfo.value = {
            ...albumInfo.value,
            albumId: response.data.albumId || albumInfo.value?.albumId,
            albumName: response.data.albumName || albumInfo.value?.albumName,
            description: response.data.description || albumInfo.value?.description,
            ownerName: response.data.ownerName || albumInfo.value?.ownerName,
            eventDate: response.data.eventDate ?? albumInfo.value?.eventDate,
        }

        user.value = response.data
        isLoggedIn.value = true
    } catch (err: any) {
        loginError.value = err.data?.statusMessage || 'Login failed'
    } finally {
        loggingIn.value = false
    }
}

const goToLogin = async () => {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
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
    uploadWarning.value = ''
    uploadSuccess.value = false

    try {
        const authToken = getAuthToken()

        // 1. Calculate hashes and check for duplicates
        const filesWithHashes: { file: File; hash: string }[] = []
        for (const file of selectedFiles.value) {
            const hash = await calculateFileHash(file)
            filesWithHashes.push({ file, hash })
        }

        const hashes = filesWithHashes.map(f => f.hash)
        const { duplicates } = await $fetch<{ success: boolean, duplicates: string[] }>('/api/v1/photos/check-duplicates', {
            method: 'POST',
            body: { hashes },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        })

        // 2. Filter duplicates
        const filesToUpload = filesWithHashes.filter(f => !duplicates.includes(f.hash))
        const duplicateCount = filesWithHashes.length - filesToUpload.length

        if (duplicateCount > 0) {
            uploadWarning.value = `Skipped ${duplicateCount} duplicate photo${duplicateCount > 1 ? 's' : ''}.`
        }

        if (filesToUpload.length === 0) {
            uploadError.value = 'All selected photos are already uploaded.'
            uploading.value = false
            return
        }

        // 3. Upload remaining files
        uploadProgress.value = { current: 0, total: filesToUpload.length }

        for (let i = 0; i < filesToUpload.length; i++) {
            const item = filesToUpload[i]
            if (!item) continue
            const { file } = item
            const formData = new FormData()
            formData.append('file', file)

            await $fetch(`/api/v1/album/${albumInfo.value.albumId}/upload`, {
                method: 'POST',
                body: formData,
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
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

const { applyTheme, resetTheme } = useAlbumTheme()

// Initialize
onMounted(async () => {
    await checkAuth()
    await fetchAlbumInfo()
    applyTheme(albumInfo.value?.themePreset, albumInfo.value?.customTheme, 'full')
})

onUnmounted(() => {
    resetTheme()
})
</script>
