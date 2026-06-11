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
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
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
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
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
                        @mouseover="!loading && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
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

                <!-- Passkey -->
                <button @click="handlePasskeyLogin" :disabled="passkeyLoading"
                    class="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-full transition"
                    style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                    @mouseover="!passkeyLoading && ($event.currentTarget.style.background = 'var(--surface-3)')"
                    @mouseout="$event.currentTarget.style.background = 'var(--surface-2)'">
                    <svg v-if="!passkeyLoading" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-2);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                    </svg>
                    <span v-else class="w-4 h-4 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--text-2);"></span>
                    <span>{{ passkeyLoading ? 'Waiting for passkey…' : 'Sign in with Passkey or Security Key' }}</span>
                </button>

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
