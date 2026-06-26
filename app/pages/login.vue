<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="w-full max-w-sm">
            <!-- Logo / Header -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style="background: var(--accent-light);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--accent);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                </div>
                <h1 class="text-2xl font-bold tracking-tight" style="color: var(--text-1);">PicHaus</h1>
                <p class="mt-1 text-sm" style="color: var(--text-2);">Sign in to your account</p>
            </div>

            <!-- Login Card -->
            <div class="rounded-2xl p-6" style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-md);">
                <form @submit.prevent="handleLogin" class="space-y-4">
                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">
                            Email
                        </label>
                        <input id="email" v-model="form.email" type="email" required autocomplete="email"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="your@email.com"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">
                            Password
                        </label>
                        <input id="password" v-model="form.password" type="password" required autocomplete="current-password"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="••••••••"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <!-- Error -->
                    <div v-if="error" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ error }}
                    </div>

                    <!-- Submit -->
                    <button type="submit" :disabled="loading"
                        class="w-full py-2.5 text-sm font-medium rounded-full transition"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!loading && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <span v-if="loading" class="flex items-center justify-center gap-2">
                            <span class="w-4 h-4 rounded-full border-2 animate-spin"
                                style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></span>
                            Signing in…
                        </span>
                        <span v-else>Sign In</span>
                    </button>
                </form>

                <!-- Divider -->
                <div class="flex items-center gap-3 my-5">
                    <div class="flex-1 h-px" style="background: var(--separator);"></div>
                    <span class="text-xs" style="color: var(--text-3);">or</span>
                    <div class="flex-1 h-px" style="background: var(--separator);"></div>
                </div>

                <div class="space-y-2.5">
                    <!-- Google Sign-In -->
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

                    <!-- Passkey -->
                    <button @click="handlePasskeyLogin" :disabled="passkeyLoading"
                        class="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-full transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="!passkeyLoading && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <svg v-if="!passkeyLoading" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-2);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                        </svg>
                        <span v-else class="w-4 h-4 rounded-full border-2 animate-spin"
                            style="border-color: var(--separator); border-top-color: var(--text-2);"></span>
                        <span>{{ passkeyLoading ? 'Waiting for passkey…' : 'Sign in with Passkey or Security Key' }}</span>
                    </button>
                </div>

                <div v-if="passkeyError" class="mt-3 rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ passkeyError }}
                </div>
            </div>

            <!-- Footer -->
            <p class="text-center text-xs mt-6" style="color: var(--text-3);">
                Collaborative photo albums for photography clubs
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { setAuthToken, clearAuthToken } from '~/utils/auth-client'

const route = useRoute()
const { trigger: splashTrigger, dismiss: splashDismiss } = useSplash()
const { settings: siteSettings, loadSettings } = useSiteSettings()

const getRedirectTarget = () => {
    const redirect = route.query.redirect
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
        return redirect
    }
    return '/album'
}

const form = ref({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const passkeyLoading = ref(false)
const passkeyError = ref('')
const googleLoading = ref(false)

const handleLogin = async () => {
    loading.value = true
    error.value = ''
    try {
        const response = await $fetch<{ success: boolean; data: { accessToken: string; name: string } }>('/api/v1/auth/login', {
            method: 'POST',
            body: form.value,
        })
        if (response.success) {
            setAuthToken(response.data.accessToken)
            splashTrigger(response.data.name)
            await navigateTo(getRedirectTarget())
            await splashDismiss()
        }
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Login failed. Please check your credentials.'
    } finally {
        loading.value = false
    }
}

const handlePasskeyLogin = async () => {
    passkeyLoading.value = true
    passkeyError.value = ''
    try {
        const { startAuthentication } = await import('@simplewebauthn/browser')

        const optRes = await $fetch<{ success: boolean; data: { options: any; challengeId: string } }>(
            '/api/v1/auth/passkey/login-options', { method: 'POST', body: {} }
        )

        const authResponse = await startAuthentication({ optionsJSON: optRes.data.options })

        const verifyRes = await $fetch<{ success: boolean; data: { accessToken: string; name: string } }>(
            '/api/v1/auth/passkey/login-verify', {
                method: 'POST',
                body: { response: authResponse, challengeId: optRes.data.challengeId },
            }
        )

        setAuthToken(verifyRes.data.accessToken)
        splashTrigger(verifyRes.data.name)
        await navigateTo(getRedirectTarget())
        await splashDismiss()
    } catch (err: any) {
        if (err?.name === 'NotAllowedError') return
        passkeyError.value = err?.data?.statusMessage || err?.message || 'Passkey sign-in failed'
    } finally {
        passkeyLoading.value = false
    }
}

const handleGoogleLogin = async () => {
    googleLoading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: { url: string } }>('/api/v1/auth/google/initiate', {
            query: { redirect: getRedirectTarget() },
        })
        window.location.href = res.data.url
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Google sign-in is not available'
        googleLoading.value = false
    }
}

onMounted(async () => {
    try {
        const status = await $fetch<{ data: { setupComplete: boolean } }>('/api/v1/setup/status')
        if (!status.data.setupComplete) { await navigateTo('/setup'); return }
        await loadSettings()
        try {
            await $fetch('/api/v1/auth/me')
            await navigateTo(getRedirectTarget())
        } catch {
            clearAuthToken()
        }
    } catch (err) {
        console.error('Error checking status:', err)
    }
})
</script>
