<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-white mb-2">PicHaus</h1>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
                <p class="text-[var(--text-muted)] animate-pulse">Validating link…</p>
            </div>

            <!-- Error (invalid / used / expired) -->
            <div v-else-if="tokenError" class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center space-y-3">
                <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <p class="text-white font-semibold">Link unavailable</p>
                <p class="text-[var(--text-muted)] text-sm">{{ tokenError }}</p>
                <NuxtLink to="/login" class="inline-block mt-2 text-purple-300 hover:text-purple-200 text-sm underline">
                    Go to sign in
                </NuxtLink>
            </div>

            <!-- Success -->
            <div v-else-if="done" class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center space-y-3">
                <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p class="text-white font-semibold">{{ doneMessage }}</p>
                <p class="text-[var(--text-muted)] text-sm">Redirecting to sign in…</p>
            </div>

            <!-- Password Reset form -->
            <div v-else-if="tokenData?.type === 'password_reset'" class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h2 class="text-2xl font-bold text-white mb-1">Reset Password</h2>
                <p v-if="tokenData.targetEmail" class="text-[var(--text-muted)] text-sm mb-6">
                    For <span class="text-white">{{ tokenData.targetEmail }}</span>
                </p>
                <form @submit.prevent="submit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">New Password</label>
                        <input v-model="form.password" type="password" required minlength="8" autofocus
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Minimum 8 characters" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Confirm Password</label>
                        <input v-model="form.confirm" type="password" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Repeat password" />
                    </div>
                    <div v-if="submitError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ submitError }}</p>
                    </div>
                    <button type="submit" :disabled="submitting"
                        class="w-full bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50">
                        {{ submitting ? 'Saving…' : 'Set New Password' }}
                    </button>
                </form>
            </div>

            <!-- Invite (new account) form -->
            <div v-else-if="tokenData?.type === 'invite'" class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h2 class="text-2xl font-bold text-white mb-1">Create Account</h2>
                <p v-if="tokenData.label" class="text-[var(--text-muted)] text-sm mb-6">{{ tokenData.label }}</p>
                <form @submit.prevent="submit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Name</label>
                        <input v-model="form.name" type="text" required autofocus
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Your name" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
                        <input v-model="form.email" type="email" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="your@email.com" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Password</label>
                        <input v-model="form.password" type="password" required minlength="8"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Minimum 8 characters" />
                    </div>
                    <div v-if="submitError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ submitError }}</p>
                    </div>
                    <button type="submit" :disabled="submitting"
                        class="w-full bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50">
                        {{ submitting ? 'Creating account…' : 'Create Account' }}
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { setAuthToken } from '~/utils/auth-client'

definePageMeta({ layout: false })

const route = useRoute()
const token = route.params.token as string

interface TokenData {
    type: 'invite' | 'password_reset'
    label: string | null
    expiresAt: number
    targetEmail: string | null
    targetName: string | null
}

const loading = ref(true)
const tokenData = ref<TokenData | null>(null)
const tokenError = ref<string | null>(null)
const done = ref(false)
const doneMessage = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)

const form = reactive({ name: '', email: '', password: '', confirm: '' })

onMounted(async () => {
    try {
        const res = await $fetch<{ success: boolean; data: TokenData }>(`/api/invite/${token}`)
        tokenData.value = res.data
    } catch (err: any) {
        tokenError.value = err?.data?.statusMessage ?? 'This link is invalid or has expired.'
    } finally {
        loading.value = false
    }
})

async function submit() {
    submitError.value = null

    if (tokenData.value?.type === 'password_reset' && form.password !== form.confirm) {
        submitError.value = 'Passwords do not match'
        return
    }

    submitting.value = true
    try {
        const body = tokenData.value?.type === 'password_reset'
            ? { password: form.password }
            : { name: form.name, email: form.email, password: form.password }

        const res = await $fetch<any>(`/api/invite/${token}`, { method: 'POST', body })

        if (res.data?.accessToken) {
            setAuthToken(res.data.accessToken)
        }

        doneMessage.value = res.message ?? 'Done!'
        done.value = true
        setTimeout(() => navigateTo('/login'), 2000)
    } catch (err: any) {
        submitError.value = err?.data?.statusMessage ?? 'Something went wrong. Please try again.'
    } finally {
        submitting.value = false
    }
}
</script>
