<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <!-- Logo/Header -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold text-white mb-2">📸 PicHaus</h1>
                <p class="text-[var(--text-secondary)]">Welcome back</p>
            </div>

            <!-- Login Card -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                <h2 class="text-2xl font-bold text-white mb-6">Sign In</h2>

                <form @submit.prevent="handleLogin" class="space-y-4">
                    <!-- Email Field -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Email
                        </label>
                        <input id="email" v-model="form.email" type="email" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="your@email.com" />
                    </div>

                    <!-- Password Field -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Password
                        </label>
                        <input id="password" v-model="form.password" type="password" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Enter your password" />
                    </div>

                    <!-- Error Message -->
                    <div v-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ error }}</p>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" :disabled="loading"
                        class="w-full bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                        <span v-if="loading">Signing in...</span>
                        <span v-else>Sign In</span>
                    </button>
                </form>

                <!-- Passkey divider -->
                <div class="flex items-center gap-3 my-5">
                    <div class="flex-1 h-px bg-white/10"></div>
                    <span class="text-xs text-[var(--text-muted)]">or</span>
                    <div class="flex-1 h-px bg-white/10"></div>
                </div>

                <!-- Passkey Button -->
                <button @click="handlePasskeyLogin" :disabled="passkeyLoading"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
                    <svg v-if="!passkeyLoading" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                    </svg>
                    <div v-else class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <span>{{ passkeyLoading ? 'Waiting for passkey…' : 'Sign in with Passkey or Security Key' }}</span>
                </button>

                <div v-if="passkeyError" class="mt-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p class="text-red-200 text-sm">{{ passkeyError }}</p>
                </div>
            </div>

            <!-- Footer -->
            <p class="text-center text-[var(--text-tertiary)] text-sm mt-6">
                Collaborative photo albums for photography clubs
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { setAuthToken, clearAuthToken } from '~/utils/auth-client'

const route = useRoute()
const { trigger: splashTrigger, dismiss: splashDismiss } = useSplash()

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

        // Get challenge (discoverable credentials — no email needed)
        const optRes = await $fetch<{ success: boolean; data: { options: any; challengeId: string } }>(
            '/api/v1/auth/passkey/login-options', { method: 'POST', body: {} }
        )

        // Prompt browser/OS to select a passkey or touch a hardware key
        const authResponse = await startAuthentication({ optionsJSON: optRes.data.options })

        // Verify and get session token
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
        // User cancelled — don't show an error
        if (err?.name === 'NotAllowedError') return
        passkeyError.value = err?.data?.statusMessage || err?.message || 'Passkey sign-in failed'
    } finally {
        passkeyLoading.value = false
    }
}

onMounted(async () => {
    try {
        const status = await $fetch<{ data: { setupComplete: boolean } }>('/api/v1/setup/status')
        if (!status.data.setupComplete) { await navigateTo('/setup'); return }
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
