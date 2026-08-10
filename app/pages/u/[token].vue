<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="rounded-2xl p-8 max-w-md w-full"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">

            <!-- Header -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                    style="background: var(--accent-light);">
                    <Icon name="lucide:camera" class="w-7 h-7" style="color: var(--accent);" :stroke-width="1.5" />
                </div>
                <div v-if="loading" class="flex justify-center">
                    <div class="w-5 h-5 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>
                <template v-else-if="error">
                    <p class="text-base font-semibold mb-1" style="color: var(--error-text);">{{ error }}</p>
                </template>
                <template v-else>
                    <h1 class="text-xl font-bold mb-1" style="color: var(--text-1);">{{ stepTitle }}</h1>
                    <p class="text-sm" style="color: var(--text-2);">
                        Album: <span style="color: var(--text-1);">{{ albumName || 'Private Album' }}</span>
                        <span v-if="ownerName" class="block mt-0.5" style="color: var(--text-3);">Shared by {{ ownerName }}</span>
                    </p>
                </template>
            </div>

            <div v-if="!loading && !error">

                <!-- Step: Password -->
                <form v-if="step === 'password'" @submit.prevent="handlePasswordSubmit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Upload Password</label>
                        <input v-model="uploadPassword" type="password" required placeholder="Enter password"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <button type="submit" :disabled="verifying"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!verifying && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ verifying ? 'Verifying…' : 'Continue' }}
                    </button>
                </form>

                <!-- Step: Identity -->
                <div v-else-if="step === 'identity'" class="space-y-2.5">
                    <!-- Sign In -->
                    <button type="button" @click="goToLogin"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style="background: var(--accent-light);">
                            <Icon name="lucide:log-in" class="w-5 h-5" style="color: var(--accent);" :stroke-width="1.75" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Sign In</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Already have a PicHaus account</p>
                        </div>
                        <Icon name="lucide:chevron-right" class="w-4 h-4 flex-shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                    </button>

                    <!-- Google Sign In -->
                    <button v-if="siteSettings.googleOAuthEnabled" type="button" @click="handleGoogleLogin($event)"
                        :disabled="googleLoading"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition disabled:opacity-60"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="!googleLoading && (($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border"
                            style="border-color: var(--separator);">
                            <img v-if="!googleLoading && siteSettings.googleButtonLogoUrl" :src="siteSettings.googleButtonLogoUrl" class="w-5 h-5 object-contain" />
                            <Icon v-else-if="!googleLoading" name="logos:google-icon" class="w-5 h-5" />
                            <div v-else class="w-4 h-4 rounded-full border-2 animate-spin"
                                style="border-color: var(--separator); border-top-color: #4285F4;"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">{{ siteSettings.googleButtonText || 'Sign in with Google' }}</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Use your Google account</p>
                        </div>
                        <Icon name="lucide:chevron-right" class="w-4 h-4 flex-shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                    </button>

                    <!-- Microsoft Sign In -->
                    <button v-if="siteSettings.microsoftOAuthEnabled" type="button" @click="handleMicrosoftLogin"
                        :disabled="microsoftLoading"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition disabled:opacity-60"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="!microsoftLoading && (($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border"
                            style="border-color: var(--separator);">
                            <img v-if="!microsoftLoading && siteSettings.microsoftButtonLogoUrl" :src="siteSettings.microsoftButtonLogoUrl" class="w-5 h-5 object-contain" />
                            <Icon v-else-if="!microsoftLoading" name="logos:microsoft-icon" class="w-5 h-5" />
                            <div v-else class="w-4 h-4 rounded-full border-2 animate-spin"
                                style="border-color: var(--separator); border-top-color: #00a4ef;"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">{{ siteSettings.microsoftButtonText || 'Sign in with Microsoft' }}</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Use your Microsoft account</p>
                        </div>
                        <Icon name="lucide:chevron-right" class="w-4 h-4 flex-shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                    </button>

                    <!-- Divider -->
                    <div class="relative py-1">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t" style="border-color: var(--separator);"></div>
                        </div>
                        <div class="relative flex justify-center">
                            <span class="px-3 text-xs" style="background: var(--surface-1); color: var(--text-3);">or</span>
                        </div>
                    </div>

                    <!-- Create Account -->
                    <button v-if="siteSettings.allowRegistration" type="button" @click="step = 'signup'"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style="background: var(--success-bg);">
                            <Icon name="lucide:user-plus" class="w-5 h-5" style="color: var(--success-text);" :stroke-width="1.75" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Create Account</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Sign up with email and password</p>
                        </div>
                        <Icon name="lucide:chevron-right" class="w-4 h-4 flex-shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                    </button>

                    <!-- Continue as Guest -->
                    <button type="button" @click="step = 'guest'"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style="background: var(--surface-3);">
                            <Icon name="lucide:user" class="w-5 h-5" style="color: var(--text-2);" :stroke-width="1.75" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Continue as Guest</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Name only — no account needed</p>
                        </div>
                        <Icon name="lucide:chevron-right" class="w-4 h-4 flex-shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                    </button>
                </div>

                <!-- Step: Sign Up -->
                <form v-else-if="step === 'signup'" @submit.prevent="handleSignupSubmit" class="space-y-4">
                    <button type="button" @click="step = 'identity'"
                        class="flex items-center gap-1 text-xs font-medium mb-1 transition"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <Icon name="lucide:chevron-left" class="w-3.5 h-3.5" :stroke-width="2.5" />
                        Back
                    </button>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="signupForm.name" type="text" required placeholder="Your Name"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="signupForm.email" type="email" required placeholder="your@email.com"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password</label>
                        <input v-model="signupForm.password" type="password" required placeholder="••••••••" minlength="8"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Confirm Password</label>
                        <input v-model="signupForm.confirmPassword" type="password" required placeholder="••••••••"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <p v-if="signupError" class="text-xs rounded-xl px-3.5 py-2.5"
                        style="color: var(--error-text); background: var(--error-bg); border: 1px solid var(--error-border);">{{ signupError }}</p>
                    <button type="submit" :disabled="submitting"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!submitting && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ submitting ? 'Creating account…' : 'Create Account & Upload' }}
                    </button>
                </form>

                <!-- Step: Guest -->
                <form v-else-if="step === 'guest'" @submit.prevent="handleGuestSubmit" class="space-y-4">
                    <button type="button" @click="step = 'identity'"
                        class="flex items-center gap-1 text-xs font-medium mb-1 transition"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <Icon name="lucide:chevron-left" class="w-3.5 h-3.5" :stroke-width="2.5" />
                        Back
                    </button>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">
                            Name <span style="color: var(--error-text);">*</span>
                        </label>
                        <input v-model="guestForm.name" type="text" required placeholder="Your Name"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Instagram <span style="color: var(--text-3);">(optional)</span></label>
                        <div class="relative">
                            <span class="absolute left-3.5 top-2.5 text-sm" style="color: var(--text-3);">@</span>
                            <input v-model="guestForm.instagram" type="text" placeholder="username"
                                class="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>
                    </div>
                    <p class="text-xs" style="color: var(--text-3);">No account needed. The organizer can invite you to set up a full account later.</p>
                    <p v-if="guestError" class="text-xs rounded-xl px-3.5 py-2.5"
                        style="color: var(--error-text); background: var(--error-bg); border: 1px solid var(--error-border);">{{ guestError }}</p>
                    <button type="submit" :disabled="guestSubmitting"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!guestSubmitting && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ guestSubmitting ? 'Joining…' : 'Start Uploading' }}
                    </button>
                </form>

                <!-- Step: Upload -->
                <div v-else-if="step === 'upload'" class="space-y-4">
                    <div @click="triggerFileInput" @dragover.prevent @drop.prevent="handleFileSelect"
                        class="rounded-2xl p-8 text-center cursor-pointer transition group"
                        style="border: 2px dashed var(--separator); background: var(--surface-2);"
                        @dragenter="($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; ($event.currentTarget as HTMLElement).style.background = 'var(--accent-light)'"
                        @dragleave="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'; ($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <input type="file" ref="fileInput" multiple accept="image/*" class="hidden" @change="handleFileSelect" />
                        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition group-hover:scale-105"
                            style="background: var(--accent-light);">
                            <Icon name="lucide:upload" class="w-7 h-7" style="color: var(--accent);" :stroke-width="1.5" />
                        </div>
                        <p class="font-semibold text-sm mb-1" style="color: var(--text-1);">Click or drop photos here</p>
                        <p class="text-xs" style="color: var(--text-3);">Upload to this album</p>
                    </div>

                    <!-- Overall Progress Card -->
                    <div v-if="files.length > 0" class="rounded-xl p-4 space-y-3"
                        style="background: var(--surface-2); border: 1px solid var(--accent-light);">
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-medium" style="color: var(--text-1);">
                                <span v-if="uploadStats.uploading > 0 || uploadStats.pending > 0">
                                    Uploading photos ({{ uploadStats.done }}/{{ uploadStats.total }})
                                </span>
                                <span v-else-if="uploadStats.error > 0">
                                    Upload completed with errors ({{ uploadStats.done }} succeeded, {{ uploadStats.error }} failed)
                                </span>
                                <span v-else>
                                    All uploads completed!
                                </span>
                            </span>
                            <span class="font-semibold" style="color: var(--accent);">{{ overallProgress }}%</span>
                        </div>
                        <div class="w-full rounded-full h-2.5" style="background: var(--surface-3);">
                            <div class="h-2.5 rounded-full transition-all duration-300"
                                :style="`width: ${overallProgress}%; background: var(--accent);`">
                            </div>
                        </div>
                    </div>

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
const dialog = useDialog()
import { getAuthToken, setAuthToken } from '~/utils/auth-client'

const { settings: siteSettings, loadSettings } = useSiteSettings()
const route = useRoute()
const token = route.params.token as string

type Step = 'password' | 'identity' | 'signup' | 'guest' | 'upload'
const step = ref<Step>('password')
const loading = ref(true)
const error = ref('')
const albumName = ref('')
const ownerName = ref('')
const requiresPassword = ref(false)
const albumId = ref('')
const isLoggedIn = ref(false)

const uploadPassword = ref('')
const verifying = ref(false)

const signupForm = ref({ name: '', email: '', password: '', confirmPassword: '' })
const signupError = ref('')
const submitting = ref(false)

const guestForm = ref({ name: '', instagram: '' })
const guestError = ref('')
const guestSubmitting = ref(false)

const googleLoading = ref(false)
const microsoftLoading = ref(false)

interface FileUpload {
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'done' | 'error'
    errorMessage?: string
}
const files = ref<FileUpload[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm|avi|mkv|wmv|flv|mpeg|mpg|3gp|3g2)$/i
const IMAGE_FILE_RE = /\.(heic|heif|raw|arw|cr2|nef|orf|rw2|dng)$/i

const isVideoFile = (file: File) => file.type.startsWith('video/') || VIDEO_FILE_RE.test(file.name)
const isAcceptedImageFile = (file: File) => !isVideoFile(file) && (file.type.startsWith('image/') || IMAGE_FILE_RE.test(file.name))

const overallProgress = computed(() => {
    if (files.value.length === 0) return 0
    let totalSize = 0
    let uploadedSize = 0
    files.value.forEach(f => {
        totalSize += f.file.size
        uploadedSize += (f.progress / 100) * f.file.size
    })
    return totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0
})

const uploadStats = computed(() => {
    const total = files.value.length
    const done = files.value.filter(f => f.status === 'done').length
    const error = files.value.filter(f => f.status === 'error').length
    const uploading = files.value.filter(f => f.status === 'uploading').length
    const pending = files.value.filter(f => f.status === 'pending').length
    
    return { total, done, error, uploading, pending }
})

const checkUploadCompletion = () => {
    if (files.value.length === 0) return

    const allFinished = files.value.every(f => f.status === 'done' || f.status === 'error')
    if (allFinished) {
        const anySuccess = files.value.some(f => f.status === 'done')
        const anyError = files.value.some(f => f.status === 'error')
        
        if (anySuccess) {
            if (anyError) {
                dialog.toast('Some uploads failed, redirecting to album...', 'warning')
                setTimeout(() => {
                    navigateTo(`/album/${albumId.value}`)
                }, 3000)
            } else {
                dialog.toast('Upload complete! Redirecting...', 'success')
                setTimeout(() => {
                    navigateTo(`/album/${albumId.value}`)
                }, 1000)
            }
        }
    }
}

const stepTitle = computed(() => {
    if (step.value === 'password') return 'Password Required'
    if (step.value === 'identity') return 'Join Album'
    if (step.value === 'signup') return 'Create Account'
    if (step.value === 'guest') return 'Continue as Guest'
    return 'Upload Photos'
})

async function autoJoinAsLoggedIn(authToken: string, pw: string): Promise<boolean> {
    try {
        const joinRes = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: { token, password: pw },
            headers: { Authorization: `Bearer ${authToken}` },
        })
        albumId.value = joinRes.data.albumId
        navigateTo(`/album/${albumId.value}?upload=true`)
        return true
    } catch (err: any) {
        const status = err.status ?? err.data?.statusCode
        if (status === 401) return false
        // Non-auth errors (e.g. already a collaborator) — still allow upload
        navigateTo(`/album/${albumId.value}?upload=true`)
        return true
    }
}

onMounted(async () => {
    await loadSettings()
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

        const authToken = getAuthToken()
        if (authToken) {
            isLoggedIn.value = true
            // Recover upload password stored before Google OAuth redirect
            const storedPw = sessionStorage.getItem(`upload_pw_${token}`) ?? ''
            if (storedPw) sessionStorage.removeItem(`upload_pw_${token}`)
            uploadPassword.value = storedPw

            const joined = await autoJoinAsLoggedIn(authToken, storedPw)
            if (!joined) {
                // Password required — show gate; will auto-join after successful verify
                step.value = 'password'
            }
        } else {
            step.value = requiresPassword.value ? 'password' : 'identity'
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
            body: { token, password: uploadPassword.value },
        })

        if (isLoggedIn.value) {
            const authToken = getAuthToken()
            if (authToken) {
                const joined = await autoJoinAsLoggedIn(authToken, uploadPassword.value)
                if (!joined) {
                    dialog.toast('Failed to join album. Please try signing in again.')
                }
            }
        } else {
            step.value = 'identity'
        }
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Invalid password')
    } finally {
        verifying.value = false
    }
}

const handleGoogleLogin = async (event?: MouseEvent) => {
    googleLoading.value = true
    try {
        if (uploadPassword.value) {
            sessionStorage.setItem(`upload_pw_${token}`, uploadPassword.value)
        }
        const bypassDomain = siteSettings.value.googleOAuthShiftBypassEnabled && event?.shiftKey
        const query = new URLSearchParams({ uploadToken: token })
        if (bypassDomain) query.set('bypassDomain', 'true')
        const res = await $fetch<{ success: boolean; data: { url: string } }>(
            `/api/v1/auth/google/initiate?${query}`
        )
        await navigateTo(res.data.url, { external: true })
    } catch (err: any) {
        googleLoading.value = false
        dialog.toast(err.data?.statusMessage || 'Failed to initiate Google sign-in')
    }
}

const handleMicrosoftLogin = async () => {
    microsoftLoading.value = true
    try {
        if (uploadPassword.value) {
            sessionStorage.setItem(`upload_pw_${token}`, uploadPassword.value)
        }
        const res = await $fetch<{ success: boolean; data: { url: string } }>(
            `/api/v1/auth/microsoft/initiate?${new URLSearchParams({ uploadToken: token })}`
        )
        await navigateTo(res.data.url, { external: true })
    } catch (err: any) {
        microsoftLoading.value = false
        dialog.toast(err.data?.statusMessage || 'Failed to initiate Microsoft sign-in')
    }
}

const handleSignupSubmit = async () => {
    signupError.value = ''
    if (signupForm.value.password !== signupForm.value.confirmPassword) {
        signupError.value = 'Passwords do not match'
        return
    }
    submitting.value = true
    try {
        await $fetch('/api/v1/auth/register', {
            method: 'POST',
            body: {
                name: signupForm.value.name,
                email: signupForm.value.email,
                password: signupForm.value.password,
            },
        })
        const loginRes = await $fetch<{ success: boolean; data: { accessToken: string } }>('/api/v1/auth/login', {
            method: 'POST',
            body: { email: signupForm.value.email, password: signupForm.value.password },
        })
        const accessToken = loginRes.data.accessToken
        setAuthToken(accessToken)

        const joinRes = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: { token, password: uploadPassword.value },
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        albumId.value = joinRes.data.albumId
        navigateTo(`/album/${albumId.value}?upload=true`)
    } catch (err: any) {
        signupError.value = err.data?.statusMessage || 'Failed to create account'
    } finally {
        submitting.value = false
    }
}

const handleGuestSubmit = async () => {
    guestError.value = ''
    guestSubmitting.value = true
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: {
                token,
                password: uploadPassword.value,
                name: guestForm.value.name,
                instagram: guestForm.value.instagram || undefined,
            },
        })
        if (response.data?.accessToken) setAuthToken(response.data.accessToken)
        albumId.value = response.data.albumId
        navigateTo(`/album/${albumId.value}?upload=true`)
    } catch (err: any) {
        guestError.value = err.data?.statusMessage || 'Failed to continue'
    } finally {
        guestSubmitting.value = false
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

    let rejectedCount = 0
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        if (!file) continue

        if (!isAcceptedImageFile(file)) {
            rejectedCount++
            files.value.unshift({
                file,
                progress: 100,
                status: 'error',
                errorMessage: 'Only image files can be uploaded. Videos are not supported.',
            })
            continue
        }

        files.value.unshift({ file, progress: 0, status: 'pending' })
    }

    if (rejectedCount > 0) {
        dialog.toast('Only image files can be uploaded. Videos are not supported.', 'error')
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
        checkUploadCompletion()
    })
    xhr.addEventListener('error', () => {
        fileUpload.status = 'error'
        fileUpload.errorMessage = 'Network error'
        checkUploadCompletion()
    })

    const authToken = getAuthToken()
    xhr.open('POST', `/api/v1/album/${albumId.value}/upload`)
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.send(formData)
}
</script>
