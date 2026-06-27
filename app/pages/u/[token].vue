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
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
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
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: var(--accent);" stroke-width="1.75">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Sign In</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Already have a PicHaus account</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" style="color: var(--text-3);" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <!-- Google Sign In -->
                    <button v-if="siteSettings.googleOAuthEnabled" type="button" @click="handleGoogleLogin"
                        :disabled="googleLoading"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition disabled:opacity-60"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="!googleLoading && (($event.currentTarget as HTMLElement).style.borderColor = '#4285F4')"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border"
                            style="border-color: var(--separator);">
                            <svg v-if="!googleLoading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5">
                                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.9C14.7 15.9 19.1 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 37.6 16.2 44 24 44z"/>
                                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.7 36.2 44 31.2 44 24c0-1.3-.1-2.7-.4-3.9z"/>
                            </svg>
                            <div v-else class="w-4 h-4 rounded-full border-2 animate-spin"
                                style="border-color: #e5e7eb; border-top-color: #4285F4;"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Sign in with Google</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Use your Google account</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" style="color: var(--text-3);" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
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
                            style="background: rgba(34,197,94,0.12);">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: #22c55e;" stroke-width="1.75">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Create Account</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Sign up with email and password</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" style="color: var(--text-3);" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <!-- Continue as Guest -->
                    <button type="button" @click="step = 'guest'"
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.borderColor = 'var(--separator)'">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style="background: rgba(156,163,175,0.15);">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: var(--text-2);" stroke-width="1.75">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold" style="color: var(--text-1);">Continue as Guest</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">Name only — no account needed</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" style="color: var(--text-3);" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <!-- Step: Sign Up -->
                <form v-else-if="step === 'signup'" @submit.prevent="handleSignupSubmit" class="space-y-4">
                    <button type="button" @click="step = 'identity'"
                        class="flex items-center gap-1 text-xs font-medium mb-1 transition"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="signupForm.name" type="text" required placeholder="Your Name"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="signupForm.email" type="email" required placeholder="your@email.com"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password</label>
                        <input v-model="signupForm.password" type="password" required placeholder="••••••••" minlength="8"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Confirm Password</label>
                        <input v-model="signupForm.confirmPassword" type="password" required placeholder="••••••••"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
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
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">
                            Name <span style="color: var(--error-text);">*</span>
                        </label>
                        <input v-model="guestForm.name" type="text" required placeholder="Your Name"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Instagram <span style="color: var(--text-3);">(optional)</span></label>
                        <div class="relative">
                            <span class="absolute left-3.5 top-2.5 text-sm" style="color: var(--text-3);">@</span>
                            <input v-model="guestForm.instagram" type="text" placeholder="username"
                                class="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
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
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: var(--accent);">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <p class="font-semibold text-sm mb-1" style="color: var(--text-1);">Click or drop photos here</p>
                        <p class="text-xs" style="color: var(--text-3);">Upload to this album</p>
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

interface FileUpload {
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'done' | 'error'
    errorMessage?: string
}
const files = ref<FileUpload[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

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
        step.value = 'upload'
        return true
    } catch (err: any) {
        const status = err.status ?? err.data?.statusCode
        if (status === 401) return false
        // Non-auth errors (e.g. already a collaborator) — still allow upload
        step.value = 'upload'
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

const handleGoogleLogin = async () => {
    googleLoading.value = true
    try {
        if (uploadPassword.value) {
            sessionStorage.setItem(`upload_pw_${token}`, uploadPassword.value)
        }
        const res = await $fetch<{ success: boolean; data: { url: string } }>(
            `/api/v1/auth/google/initiate?uploadToken=${token}`
        )
        await navigateTo(res.data.url, { external: true })
    } catch (err: any) {
        googleLoading.value = false
        dialog.toast(err.data?.statusMessage || 'Failed to initiate Google sign-in')
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
        step.value = 'upload'
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
        step.value = 'upload'
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
