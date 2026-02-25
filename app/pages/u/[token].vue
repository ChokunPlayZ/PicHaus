<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] flex items-center justify-center p-4">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full shadow-xl">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-white mb-2">📸 PicHaus</h1>
                <p v-if="loading" class="text-purple-200 animate-pulse">Checking link...</p>
                <p v-else-if="error" class="text-red-300">{{ error }}</p>
                <div v-else>
                    <p class="text-xl font-semibold text-white mb-2">
                        {{ getStepTitle }}
                    </p>
                    <p class="text-purple-200 text-sm">
                        to album "{{ albumName || 'Private Album' }}"
                    </p>
                </div>
            </div>

            <div v-if="!loading && !error">
                <!-- Step 1: Password -->
                <form v-if="step === 'password'" @submit.prevent="handlePasswordSubmit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-1">Password Required</label>
                        <input v-model="password" type="password" required placeholder="Enter password"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30" />
                    </div>
                    <button type="submit" :disabled="verifying"
                        class="w-full px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-[var(--shadow-secondary)] mt-4">
                        {{ verifying ? 'Verifying...' : 'Next' }}
                    </button>

                    <button type="button" @click="goToLogin"
                        class="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Have an account? Sign in
                    </button>
                </form>

                <!-- Step 2: Info -->
                <form v-else-if="step === 'info'" @submit.prevent="handleInfoSubmit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-1">Name</label>
                        <input v-model="form.name" type="text" required placeholder="Your Name"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-1">Email</label>
                        <input v-model="form.email" type="email" required placeholder="your@email.com"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-1">Instagram (Optional)</label>
                        <input v-model="form.instagram" type="text" placeholder="@username"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30" />
                    </div>

                    <button type="submit" :disabled="accessing"
                        class="w-full px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-[var(--shadow-secondary)] mt-6">
                        {{ accessing ? 'Accessing...' : 'Start Uploading' }}
                    </button>

                    <button type="button" @click="goToLogin"
                        class="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Have an account? Sign in
                    </button>
                </form>

                <!-- Step 3: Upload -->
                <div v-else-if="step === 'upload'" class="space-y-6">
                    <div @click="triggerFileInput" @dragover.prevent @drop.prevent="handleFileSelect"
                        class="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-500/50 hover:bg-white/5 transition cursor-pointer group">
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
                        <h3 class="text-lg font-bold text-white mb-1">Click or Drop Photos</h3>
                        <p class="text-white/60 text-sm">to upload to this album</p>
                    </div>

                    <!-- File List with Progress -->
                    <div v-if="files.length > 0" class="space-y-3 max-h-60 overflow-y-auto pr-2">
                        <div v-for="(file, index) in files" :key="index"
                            class="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-white text-sm truncate max-w-[70%]">{{ file.file.name }}</span>
                                <span class="text-xs" :class="{
                                    'text-purple-300': file.status === 'uploading',
                                    'text-green-300': file.status === 'done',
                                    'text-red-300': file.status === 'error',
                                    'text-white/40': file.status === 'pending'
                                }">{{ file.status === 'error' ? (file.errorMessage || 'Error') : (file.status ===
                                    'uploading' ? `${file.progress}%` : file.status) }}</span>
                            </div>
                            <div class="w-full bg-white/10 rounded-full h-1.5">
                                <div class="h-1.5 rounded-full transition-all duration-300" :class="{
                                    'bg-purple-500': file.status === 'uploading',
                                    'bg-green-500': file.status === 'done',
                                    'bg-red-500': file.status === 'error',
                                    'bg-white/20': file.status === 'pending'
                                }" :style="{ width: `${file.progress}%` }">
                                </div>
                            </div>
                            <div v-if="file.status === 'error' && file.errorMessage" class="mt-1 text-xs text-red-300">
                                {{ file.errorMessage }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { setAuthToken } from '~/utils/auth-client'

const route = useRoute()
const token = route.params.token as string

// State
const step = ref<'password' | 'info' | 'upload'>('password')
const loading = ref(true)
const error = ref('')
const albumName = ref('')
const ownerName = ref('')
const requiresPassword = ref(false)
const albumId = ref('')

const password = ref('')
const verifying = ref(false)

const form = ref({
    name: '',
    email: '',
    instagram: ''
})
const accessing = ref(false)

// File Upload State
interface FileUpload {
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'done' | 'error'
    errorMessage?: string
}
const files = ref<FileUpload[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

// Computed
const getStepTitle = computed(() => {
    if (step.value === 'password') return 'Password Required'
    if (step.value === 'info') return `${ownerName.value} requested info`
    return 'Upload Photos'
})

// Init
onMounted(async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)
        const data = response.data
        albumName.value = data.albumName
        ownerName.value = data.ownerName
        requiresPassword.value = data.requiresPassword
        albumId.value = data.albumId

        const isUploadLink = data.shareType === 'upload' || data.type === 'upload'
        if (!isUploadLink) {
            error.value = 'This link is not for uploading.'
            loading.value = false
            return
        }

        // Check auth
        try {
            const userRes = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
            if (userRes.data) {
                step.value = 'upload'
            } else if (!data.requiresPassword) {
                step.value = 'info'
            }
        } catch {
            if (!data.requiresPassword) {
                step.value = 'info'
            }
        }

    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Invalid or expired link'
    } finally {
        loading.value = false
    }
})

// Step 1: Password
const handlePasswordSubmit = async () => {
    verifying.value = true
    try {
        await $fetch('/api/v1/share-links/verify-password', {
            method: 'POST',
            body: { token, password: password.value }
        })
        step.value = 'info'
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Invalid password')
    } finally {
        verifying.value = false
    }
}

// Step 2: Info
const handleInfoSubmit = async () => {
    accessing.value = true
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: {
                token,
                password: password.value,
                name: form.value.name,
                email: form.value.email,
                instagram: form.value.instagram
            }
        })

        if (response.data?.accessToken) {
            setAuthToken(response.data.accessToken)
        }

        albumId.value = response.data.albumId
        step.value = 'upload'
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to access album')
    } finally {
        accessing.value = false
    }
}

const goToLogin = async () => {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
}

// Step 3: Upload
const triggerFileInput = () => {
    fileInput.value?.click()
}

const handleFileSelect = (event: Event | DragEvent) => {
    let selectedFiles: FileList | null = null
    if (event instanceof DragEvent) {
        selectedFiles = event.dataTransfer?.files || null
    } else {
        const target = event.target as HTMLInputElement
        selectedFiles = target.files
    }

    if (!selectedFiles || selectedFiles.length === 0) return

    // Add to list
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        if (file) {
            files.value.unshift({
                file,
                progress: 0,
                status: 'pending'
            })
        }
    }

    // Start uploads
    processUploadQueue()

    if (fileInput.value) fileInput.value.value = ''
}

const processUploadQueue = async () => {
    const pendingFiles = files.value.filter(f => f.status === 'pending')
    pendingFiles.forEach(uploadFile)
}

const uploadFile = (fileUpload: FileUpload) => {
    fileUpload.status = 'uploading'
    fileUpload.errorMessage = undefined

    const formData = new FormData()
    formData.append('file', fileUpload.file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            fileUpload.progress = Math.round((event.loaded / event.total) * 100)
        }
    })

    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            fileUpload.status = 'done'
            fileUpload.progress = 100
        } else {
            fileUpload.status = 'error'
            try {
                const response = JSON.parse(xhr.responseText)
                fileUpload.errorMessage = response.statusMessage || response.message || 'Upload failed'
            } catch (e) {
                fileUpload.errorMessage = `Upload failed (${xhr.status})`
            }
        }
    })

    xhr.addEventListener('error', () => {
        fileUpload.status = 'error'
        fileUpload.errorMessage = 'Network error'
    })

    xhr.open('POST', `/api/v1/album/${albumId.value}/upload`)
    xhr.send(formData)
}
</script>
