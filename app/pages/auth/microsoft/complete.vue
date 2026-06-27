<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="text-center">
            <div v-if="error" class="rounded-2xl p-6 max-w-sm w-full text-left"
                style="background: var(--error-bg); border: 1px solid var(--error-border);">
                <p class="text-base font-semibold mb-2" style="color: var(--error-text);">Sign-in failed</p>
                <p class="text-sm mb-4" style="color: var(--error-text); opacity: 0.8;">{{ error }}</p>
                <button @click="navigateTo('/login')"
                    class="px-4 py-2 rounded-full text-sm font-medium transition"
                    style="background: var(--surface-1); color: var(--text-1); border: 1px solid var(--separator);">
                    Back to Login
                </button>
            </div>
            <div v-else class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                <p class="text-sm" style="color: var(--text-2);">Completing sign-in…</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { setAuthToken } from '~/utils/auth-client'

const route = useRoute()
const error = ref('')
const { trigger: splashTrigger, dismiss: splashDismiss } = useSplash()

function decodeState(encoded: string): { redirect?: string; uploadToken?: string } {
    try {
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(base64))
    } catch {
        return {}
    }
}

onMounted(async () => {
    const errorParam = route.query.error
    if (errorParam) {
        error.value = typeof errorParam === 'string' ? errorParam : 'Sign-in failed'
        return
    }

    const code = route.query.code
    if (!code || typeof code !== 'string') {
        error.value = 'Missing authorization code'
        return
    }

    try {
        const res = await $fetch<{ success: boolean; data: { accessToken: string; name: string; email: string; state: string } }>(
            '/api/v1/auth/microsoft/exchange', { method: 'POST', body: { code } }
        )

        setAuthToken(res.data.accessToken)
        const state = decodeState(res.data.state)

        if (state.uploadToken) {
            splashTrigger(res.data.name)
            await navigateTo(`/u/${state.uploadToken}`)
            await splashDismiss()
            return
        }

        const redirect = state.redirect && state.redirect.startsWith('/') ? state.redirect : '/album'
        splashTrigger(res.data.name)
        await navigateTo(redirect)
        await splashDismiss()
    } catch (err: any) {
        error.value = err.data?.statusMessage || err.message || 'Sign-in failed'
    }
})
</script>
