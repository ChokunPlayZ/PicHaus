<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="rounded-2xl p-8 max-w-md w-full"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">

            <!-- Header -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                    style="background: var(--accent-light);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--accent);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div v-if="loading" class="flex justify-center">
                    <div class="w-5 h-5 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>
                <template v-else-if="error">
                    <p class="text-base font-semibold mb-1" style="color: var(--error-text);">{{ error }}</p>
                </template>
                <template v-else>
                    <h1 class="text-xl font-bold mb-1" style="color: var(--text-1);">{{ getStepTitle }}</h1>
                    <p class="text-sm" style="color: var(--text-2);">
                        Album: <span style="color: var(--text-1);">{{ albumName || 'Private Album' }}</span>
                        <span v-if="ownerName" class="block mt-0.5" style="color: var(--text-3);">Shared by {{ ownerName }}</span>
                    </p>
                </template>
            </div>

            <div v-if="!loading && !error">
                <!-- Step 1: Password -->
                <form v-if="step === 'password'" @submit.prevent="handlePasswordSubmit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password Required</label>
                        <input v-model="password" type="password" required placeholder="Enter password"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <button type="submit" :disabled="verifying"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!verifying && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                        {{ verifying ? 'Verifying…' : 'Continue' }}
                    </button>
                    <button type="button" @click="goToLogin"
                        class="w-full py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Have an account? Sign in
                    </button>
                </form>

                <!-- Step 2: Info -->
                <form v-else-if="step === 'info'" @submit.prevent="handleInfoSubmit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="form.name" type="text" required placeholder="Your Name"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="form.email" type="email" required placeholder="your@email.com"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Instagram <span style="color: var(--text-3);">(optional)</span></label>
                        <div class="relative">
                            <span class="absolute left-3.5 top-2.5 text-sm" style="color: var(--text-3);">@</span>
                            <input v-model="form.instagram" type="text" placeholder="username"
                                class="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                        </div>
                    </div>
                    <button type="submit" :disabled="accessing"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!accessing && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                        {{ accessing ? 'Joining…' : 'Start Uploading' }}
                    </button>
                    <button type="button" @click="goToLogin"
                        class="w-full py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Have an account? Sign in
                    </button>
                </form>

                <!-- Step 3: Upload -->
                <div v-else-if="step === 'upload'" class="space-y-4">
                    <!-- Drop zone -->
                    <div @click="triggerFileInput" @dragover.prevent @drop.prevent="handleFileSelect"
                        class="rounded-2xl p-8 text-center cursor-pointer transition group"
                        style="border: 2px dashed var(--separator); background: var(--surface-2);"
                        @dragenter="$event.currentTarget.style.borderColor = 'var(--accent)'; $event.currentTarget.style.background = 'var(--accent-light)'"
                        @dragleave="$event.currentTarget.style.borderColor = 'var(--separator)'; $event.currentTarget.style.background = 'var(--surface-2)'">
                        <input type="file" ref="fileInput" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
                        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition group-hover:scale-105"
                            style="background: var(--accent-light);">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: var(--accent);">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <p class="font-semibold text-sm mb-1" style="color: var(--text-1);">Click or drop photos here</p>
                        <p class="text-xs" style="color: var(--text-3);">Upload to this album</p>
                    </div>

                    <!-- File list -->
                    <div v-if="files.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
                        <div v-for="(file, index) in files" :key="index"
                            class="rounded-xl p-3"
                            style="background: var(--surface-2); border: 1px solid var(--separator);">
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="text-sm truncate max-w-[70%]" style="color: var(--text-1);">{{ file.file.name }}</span>
                                <span class="text-xs font-medium"
                                    :style="file.status === 'uploading' ? 'color: var(--accent)' : file.status === 'done' ? 'color: var(--success-text)' : file.status === 'error' ? 'color: var(--error-text)' : 'color: var(--text-3)'">
                                    {{ file.status === 'error' ? (file.errorMessage || 'Error') : file.status === 'uploading' ? `${file.progress}%` : file.status }}
                                </span>
                            </div>
                            <div class="w-full rounded-full h-1.5" style="background: var(--surface-3);">
                                <div class="h-1.5 rounded-full transition-all duration-300"
                                    :style="`width: ${file.progress}%; background: ${file.status === 'done' ? 'var(--success)' : file.status === 'error' ? 'var(--error)' : 'var(--accent)'}`">
                                </div>
                            </div>
                            <div v-if="file.status === 'error' && file.errorMessage" class="mt-1 text-xs"
                                style="color: var(--error-text);">{{ file.errorMessage }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getAuthToken, setAuthToken } from '~/utils/auth-client'

const route = useRoute()
const token = route.params.token as string

const step = ref<'password' | 'info' | 'upload'>('password')
const loading = ref(true)
const error = ref('')
const albumName = ref('')
const ownerName = ref('')
const requiresPassword = ref(false)
const albumId = ref('')

const password = ref('')
const verifying = ref(false)

const form = ref({ name: '', email: '', instagram: '' })
const accessing = ref(false)

interface FileUpload {
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'done' | 'error'
    errorMessage?: string
}
const files = ref<FileUpload[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const getStepTitle = computed(() => {
    if (step.value === 'password') return 'Password Required'
    if (step.value === 'info') return 'Who are you?'
    return 'Upload Photos'
})

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
        if (response.data?.accessToken) setAuthToken(response.data.accessToken)
        albumId.value = response.data.albumId
        step.value = 'upload'
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to access album')
    } finally {
        accessing.value = false
    }
}

const goToLogin = () => navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)

const triggerFileInput = () => fileInput.value?.click()

const handleFileSelect = (event: Event | DragEvent) => {
    const el = event.currentTarget as HTMLElement
    el.style.borderColor = 'var(--separator)'
    el.style.background = 'var(--surface-2)'

    let selectedFiles: FileList | null = null
    if (event instanceof DragEvent) {
        selectedFiles = event.dataTransfer?.files || null
    } else {
        selectedFiles = (event.target as HTMLInputElement).files
    }
    if (!selectedFiles || selectedFiles.length === 0) return

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        if (file) files.value.unshift({ file, progress: 0, status: 'pending' })
    }
    processUploadQueue()
    if (fileInput.value) fileInput.value.value = ''
}

const processUploadQueue = () => {
    files.value.filter(f => f.status === 'pending').forEach(uploadFile)
}

const uploadFile = (fileUpload: FileUpload) => {
    fileUpload.status = 'uploading'
    fileUpload.errorMessage = undefined

    const formData = new FormData()
    formData.append('file', fileUpload.file)
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) fileUpload.progress = Math.round((e.loaded / e.total) * 100)
    })
    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            fileUpload.status = 'done'
            fileUpload.progress = 100
        } else {
            fileUpload.status = 'error'
            try {
                const res = JSON.parse(xhr.responseText)
                fileUpload.errorMessage = res.statusMessage || res.message || 'Upload failed'
            } catch {
                fileUpload.errorMessage = `Upload failed (${xhr.status})`
            }
        }
    })
    xhr.addEventListener('error', () => {
        fileUpload.status = 'error'
        fileUpload.errorMessage = 'Network error'
    })

    const authToken = getAuthToken()
    xhr.open('POST', `/api/v1/album/${albumId.value}/upload`)
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.send(formData)
}
</script>
