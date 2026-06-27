<template>
    <div class="min-h-screen" style="background: var(--bg-page);"
        @dragenter.prevent="onDragEnter"
        @dragleave.prevent="onDragLeave"
        @dragover.prevent
        @drop.prevent="onDrop">

        <!-- Full-page drag overlay -->
        <Transition name="fade">
            <div v-if="isDragging && isLoggedIn"
                class="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
                style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
                <div class="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
                    style="background: var(--accent);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <p class="text-2xl font-bold text-white">Drop to add photos</p>
            </div>
        </Transition>

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

                <!-- Google Sign-In -->
                <div v-if="siteSettings.googleOAuthEnabled || siteSettings.microsoftOAuthEnabled" class="mb-5 space-y-2">
                    <button v-if="siteSettings.googleOAuthEnabled" @click="handleGoogleLogin" :disabled="googleLoading"
                        class="w-full flex items-center justify-center gap-2.5 py-2.5 text-sm font-medium rounded-full transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="!googleLoading && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <span v-if="googleLoading" class="w-4 h-4 rounded-full border-2 animate-spin"
                            style="border-color: var(--separator); border-top-color: var(--text-2);"></span>
                        <svg v-else viewBox="0 0 24 24" class="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>{{ googleLoading ? 'Redirecting…' : 'Sign in with Google' }}</span>
                    </button>
                    <button v-if="siteSettings.microsoftOAuthEnabled" @click="handleMicrosoftLogin" :disabled="microsoftLoading"
                        class="w-full flex items-center justify-center gap-2.5 py-2.5 text-sm font-medium rounded-full transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="!microsoftLoading && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <span v-if="microsoftLoading" class="w-4 h-4 rounded-full border-2 animate-spin"
                            style="border-color: var(--separator); border-top-color: var(--text-2);"></span>
                        <img v-else-if="siteSettings.microsoftButtonLogoUrl" :src="siteSettings.microsoftButtonLogoUrl" class="w-4 h-4 flex-shrink-0 object-contain" />
                        <svg v-else viewBox="0 0 21 21" class="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                            <rect x="11" y="1" width="9" height="9" fill="#00a4ef"/>
                            <rect x="1" y="11" width="9" height="9" fill="#7fba00"/>
                            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                        </svg>
                        <span>{{ microsoftLoading ? 'Redirecting…' : (siteSettings.microsoftButtonText || 'Sign in with Microsoft') }}</span>
                    </button>
                    <div class="flex items-center gap-3 my-4">
                        <div class="flex-1 h-px" style="background: var(--separator);"></div>
                        <span class="text-xs" style="color: var(--text-3);">or continue as guest</span>
                        <div class="flex-1 h-px" style="background: var(--separator);"></div>
                    </div>
                </div>

                <form @submit.prevent="handleGuestLogin" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name <span style="color: var(--text-3);">(optional)</span></label>
                        <input v-model="guestForm.name" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Your Name"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email <span style="color: var(--text-3);">(optional)</span></label>
                        <input v-model="guestForm.email" type="email"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="your@email.com"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                        <p class="text-xs mt-1" style="color: var(--text-3);">Helps the admin follow up with you later</p>
                    </div>
                    <div v-if="albumInfo.requiresPassword">
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Album Password</label>
                        <input v-model="guestForm.password" type="password" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Enter album password"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
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
        <div v-else class="max-w-3xl mx-auto px-4 py-10">
            <!-- Header -->
            <div class="text-center mb-8">
                <img v-if="albumInfo?.logoImageId" :src="`/api/assets/logo/${albumInfo.logoImageId}`" alt="Logo"
                    class="h-14 max-w-[180px] object-contain mx-auto mb-3" />
                <h1 v-else class="text-3xl font-bold mb-2" style="color: var(--text-1);">{{ albumInfo?.logoText || '📸 PicHaus' }}</h1>
                <p class="text-base font-semibold" style="color: var(--text-1);">{{ albumInfo?.albumName }}</p>
                <p v-if="albumInfo?.description" class="text-sm mt-1" style="color: var(--text-2);">{{ albumInfo.description }}</p>
                <div class="flex items-center justify-center gap-3 mt-2 text-xs" style="color: var(--text-3);">
                    <span>by {{ albumInfo?.ownerName }}</span>
                    <span v-if="albumInfo?.eventDate">· {{ formatDate(albumInfo.eventDate) }}</span>
                    <span>· {{ albumInfo?.photoCount }} photos</span>
                </div>
                <p class="text-xs mt-2" style="color: var(--text-3);">
                    Uploading as <span style="color: var(--accent);">{{ user?.name }}</span>
                </p>
            </div>

            <!-- Announcement Banner -->
            <div v-if="albumInfo?.uploadMessage"
                class="rounded-2xl px-5 py-4 mb-6 flex items-start gap-3"
                style="background: var(--warning-bg); border: 1px solid var(--warning-border);">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color: var(--warning-text);">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm" style="color: var(--warning-text);">{{ albumInfo.uploadMessage }}</p>
            </div>

            <!-- Drop Zone (shown when no files in queue) -->
            <div v-if="queue.length === 0"
                class="rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
                :style="dropZoneActive
                    ? 'border-color: var(--accent); background: var(--accent-light);'
                    : 'border-color: var(--separator); background: var(--surface-1);'"
                @click="fileInput?.click()"
                @dragenter.prevent="dropZoneActive = true"
                @dragleave.prevent="dropZoneActive = false"
                @dragover.prevent
                @drop.prevent="onDropZone">
                <div class="flex flex-col items-center justify-center py-16 px-8 text-center select-none">
                    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors"
                        :style="dropZoneActive ? 'background: var(--accent);' : 'background: var(--surface-3);'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 transition-colors"
                            :style="dropZoneActive ? 'color: white;' : 'color: var(--text-3);'"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <p class="text-base font-semibold mb-1" style="color: var(--text-1);">Drop photos here</p>
                    <p class="text-sm mb-4" style="color: var(--text-2);">or click to browse</p>
                    <p class="text-xs" style="color: var(--text-3);">JPEG · PNG · HEIC · RAW and more</p>
                </div>
            </div>

            <!-- File Queue -->
            <div v-else class="space-y-4">
                <!-- Queue header -->
                <div class="flex items-center justify-between">
                    <div class="text-sm font-medium" style="color: var(--text-1);">
                        {{ queue.length }} photo{{ queue.length > 1 ? 's' : '' }}
                        <span style="color: var(--text-3);">· {{ totalSizeLabel }}</span>
                    </div>
                    <div v-if="!uploading" class="flex items-center gap-2">
                        <button @click="fileInput?.click()"
                            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add more
                        </button>
                        <button @click="clearQueue"
                            class="px-3 py-1.5 rounded-full text-xs font-medium transition"
                            style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                            Clear all
                        </button>
                    </div>
                </div>

                <!-- Thumbnail grid -->
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    <div v-for="(item, index) in queue" :key="item.id"
                        class="relative aspect-square rounded-xl overflow-hidden group"
                        style="background: var(--surface-3);">
                        <img :src="item.previewUrl" class="w-full h-full object-cover" />

                        <!-- Status overlay -->
                        <div class="absolute inset-0 flex items-center justify-center transition-all"
                            :class="item.status === 'pending' ? 'bg-black/0 group-hover:bg-black/30' : 'bg-black/40'">

                            <!-- Remove button (pending only, on hover) -->
                            <button v-if="item.status === 'pending' && !uploading"
                                @click="removeFile(index)"
                                class="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full flex items-center justify-center"
                                style="background: rgba(0,0,0,0.7);">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <!-- Hashing / uploading spinner -->
                            <div v-else-if="item.status === 'hashing' || item.status === 'uploading'"
                                class="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />

                            <!-- Done -->
                            <div v-else-if="item.status === 'done'"
                                class="w-7 h-7 rounded-full flex items-center justify-center"
                                style="background: rgba(34,197,94,0.9);">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            <!-- Duplicate -->
                            <div v-else-if="item.status === 'duplicate'"
                                class="w-7 h-7 rounded-full flex items-center justify-center"
                                title="Already in album"
                                style="background: rgba(234,179,8,0.9);">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <!-- Error -->
                            <div v-else-if="item.status === 'error'"
                                class="w-7 h-7 rounded-full flex items-center justify-center"
                                :title="item.error"
                                style="background: rgba(239,68,68,0.9);">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>

                        <!-- Duplicate label -->
                        <div v-if="item.status === 'duplicate'"
                            class="absolute bottom-0 inset-x-0 py-0.5 text-center text-[10px] font-medium text-white"
                            style="background: rgba(234,179,8,0.85);">
                            duplicate
                        </div>
                    </div>
                </div>

                <!-- Overall progress bar (during upload) -->
                <div v-if="uploading" class="rounded-xl p-4" style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium" style="color: var(--text-1);">
                            Uploading {{ doneCount }} of {{ uploadableCount }}…
                        </span>
                        <span class="text-sm font-medium" style="color: var(--accent);">
                            {{ uploadableCount > 0 ? Math.round((doneCount / uploadableCount) * 100) : 0 }}%
                        </span>
                    </div>
                    <div class="w-full rounded-full h-1.5" style="background: var(--surface-3);">
                        <div class="h-1.5 rounded-full transition-all duration-500"
                            style="background: var(--accent);"
                            :style="{ width: `${uploadableCount > 0 ? (doneCount / uploadableCount) * 100 : 0}%` }"></div>
                    </div>
                </div>

                <!-- Result summary -->
                <div v-if="uploadDone" class="rounded-xl px-4 py-3 text-sm flex items-center gap-3"
                    style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ uploadSummary }}</span>
                </div>

                <div v-if="uploadError" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ uploadError }}
                </div>

                <!-- Action buttons -->
                <div class="flex gap-3">
                    <button v-if="!uploading && !uploadDone"
                        :disabled="pendingCount === 0"
                        @click="uploadPhotos"
                        class="flex-1 py-3 rounded-full text-base font-semibold transition disabled:opacity-40"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="pendingCount > 0 && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        Upload {{ pendingCount }} Photo{{ pendingCount !== 1 ? 's' : '' }}
                    </button>

                    <button v-if="uploadDone" @click="resetUpload"
                        class="flex-1 py-3 rounded-full text-base font-semibold transition"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        Upload More Photos
                    </button>
                </div>
            </div>

            <p class="text-center text-xs mt-10" style="color: var(--text-3);">Powered by PicHaus</p>
        </div>

        <!-- Hidden file input -->
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden"
            @change="handleFileSelect" />
    </div>
</template>

<script setup lang="ts">
import { getAuthToken, setAuthToken } from '~/utils/auth-client'

type FileStatus = 'pending' | 'hashing' | 'duplicate' | 'uploading' | 'done' | 'error'

interface QueueItem {
    id: string
    file: File
    previewUrl: string
    status: FileStatus
    error?: string
}

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref('')
const albumInfo = ref<any>(null)
const isLoggedIn = ref(false)
const user = ref<any>(null)

const guestForm = ref({ name: '', email: '', password: '' })
const loggingIn = ref(false)
const loginError = ref('')
const googleLoading = ref(false)
const microsoftLoading = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const queue = ref<QueueItem[]>([])
const uploading = ref(false)
const uploadDone = ref(false)
const uploadError = ref('')

const isDragging = ref(false)
const dropZoneActive = ref(false)
let dragEnterCount = 0

const totalSizeLabel = computed(() => {
    const bytes = queue.value.reduce((sum, item) => sum + item.file.size, 0)
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
})

const pendingCount = computed(() => queue.value.filter(i => i.status === 'pending').length)
const uploadableCount = computed(() => queue.value.filter(i => !['duplicate', 'error', 'pending'].includes(i.status) || i.status === 'uploading' || i.status === 'done').length)
const doneCount = computed(() => queue.value.filter(i => i.status === 'done').length)

const uploadSummary = computed(() => {
    const done = doneCount.value
    const dups = queue.value.filter(i => i.status === 'duplicate').length
    const errs = queue.value.filter(i => i.status === 'error').length
    const parts: string[] = []
    if (done > 0) parts.push(`${done} photo${done > 1 ? 's' : ''} uploaded`)
    if (dups > 0) parts.push(`${dups} duplicate${dups > 1 ? 's' : ''} skipped`)
    if (errs > 0) parts.push(`${errs} failed`)
    return parts.join(' · ')
})

const addFiles = (files: File[]) => {
    const imageFiles = files.filter(
        f => f.type.startsWith('image/') || /\.(heic|heif|raw|arw|cr2|nef|orf|rw2|dng)$/i.test(f.name)
    )
    for (const file of imageFiles) {
        const id = `${file.name}-${file.size}-${file.lastModified}`
        if (queue.value.some(item => item.id === id)) continue
        queue.value.push({ id, file, previewUrl: URL.createObjectURL(file), status: 'pending' })
    }
    uploadDone.value = false
    uploadError.value = ''
}

const removeFile = (index: number) => {
    const item = queue.value[index]
    if (item) URL.revokeObjectURL(item.previewUrl)
    queue.value.splice(index, 1)
}

const clearQueue = () => {
    queue.value.forEach(item => URL.revokeObjectURL(item.previewUrl))
    queue.value = []
    uploadDone.value = false
    uploadError.value = ''
}

const resetUpload = () => {
    queue.value.forEach(item => URL.revokeObjectURL(item.previewUrl))
    queue.value = []
    uploadDone.value = false
    uploadError.value = ''
    if (fileInput.value) fileInput.value.value = ''
}

const handleFileSelect = (event: Event) => {
    addFiles(Array.from((event.target as HTMLInputElement).files ?? []))
    if (fileInput.value) fileInput.value.value = ''
}

const onDragEnter = () => { dragEnterCount++; isDragging.value = true }
const onDragLeave = () => { if (--dragEnterCount <= 0) { dragEnterCount = 0; isDragging.value = false } }
const onDrop = (event: DragEvent) => {
    dragEnterCount = 0; isDragging.value = false
    if (!isLoggedIn.value) return
    addFiles(Array.from(event.dataTransfer?.files ?? []))
}
const onDropZone = (event: DragEvent) => {
    dropZoneActive.value = false
    addFiles(Array.from(event.dataTransfer?.files ?? []))
}

const calculateFileHash = async (file: File): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const uploadPhotos = async () => {
    const pendingItems = queue.value.filter(i => i.status === 'pending')
    if (pendingItems.length === 0) return

    uploading.value = true
    uploadError.value = ''
    uploadDone.value = false

    try {
        const authToken = getAuthToken()

        // Hash all pending files
        const filesWithHashes: { item: QueueItem; hash: string }[] = []
        for (const item of pendingItems) {
            item.status = 'hashing'
            filesWithHashes.push({ item, hash: await calculateFileHash(item.file) })
        }

        // Duplicate check
        const { duplicates } = await $fetch<{ success: boolean; duplicates: string[] }>('/api/v1/photos/check-duplicates', {
            method: 'POST',
            body: { hashes: filesWithHashes.map(f => f.hash) },
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        })

        // Mark duplicates / reset pending
        for (const { item, hash } of filesWithHashes) {
            item.status = duplicates.includes(hash) ? 'duplicate' : 'pending'
        }

        // Upload one by one
        for (const { item } of filesWithHashes.filter(({ hash }) => !duplicates.includes(hash))) {
            item.status = 'uploading'
            try {
                const formData = new FormData()
                formData.append('file', item.file)
                await $fetch(`/api/v1/album/${albumInfo.value.albumId}/upload`, {
                    method: 'POST',
                    body: formData,
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                })
                item.status = 'done'
            } catch (err: any) {
                item.status = 'error'
                item.error = err.data?.statusMessage || 'Upload failed'
            }
        }

        uploadDone.value = true
        await fetchAlbumInfo()
    } catch (err: any) {
        uploadError.value = err.data?.statusMessage || 'Something went wrong. Please try again.'
        queue.value.filter(i => i.status === 'hashing' || i.status === 'uploading').forEach(i => { i.status = 'error' })
    } finally {
        uploading.value = false
    }
}

const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
        isLoggedIn.value = true
    } catch { isLoggedIn.value = false }
}

const fetchAlbumInfo = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)
        const data = response.data
        if (data.shareType !== 'upload' && data.type !== 'upload') {
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

const handleGuestLogin = async () => {
    loggingIn.value = true
    loginError.value = ''
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: { token, name: guestForm.value.name, email: guestForm.value.email, password: guestForm.value.password },
        })
        if (response.data?.accessToken) setAuthToken(response.data.accessToken)
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

const goToLogin = () => navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)

const handleGoogleLogin = async () => {
    googleLoading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: { url: string } }>('/api/v1/auth/google/initiate', {
            query: { uploadToken: token },
        })
        window.location.href = res.data.url
    } catch (err: any) {
        loginError.value = err.data?.statusMessage || 'Google sign-in is not available'
        googleLoading.value = false
    }
}

const handleMicrosoftLogin = async () => {
    microsoftLoading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: { url: string } }>('/api/v1/auth/microsoft/initiate', {
            query: { uploadToken: token },
        })
        window.location.href = res.data.url
    } catch (err: any) {
        loginError.value = err.data?.statusMessage || 'Microsoft sign-in is not available'
        microsoftLoading.value = false
    }
}

const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

const { applyTheme, resetTheme } = useAlbumTheme()
const { settings: siteSettings, loadSettings, applyAccent } = useSiteSettings()

onMounted(async () => {
    await Promise.all([checkAuth(), loadSettings()])
    await fetchAlbumInfo()
    applyTheme(albumInfo.value?.themePreset, albumInfo.value?.customTheme, 'full')
})

onUnmounted(() => {
    queue.value.forEach(item => URL.revokeObjectURL(item.previewUrl))
    resetTheme()
    applyAccent(siteSettings.value.accentColor)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
