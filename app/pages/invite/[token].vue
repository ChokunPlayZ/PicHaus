<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="w-full max-w-md">

            <!-- Loading -->
            <div v-if="loading" class="rounded-2xl p-8 text-center"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="w-8 h-8 rounded-full border-2 animate-spin mx-auto"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                <p class="mt-4 text-sm" style="color: var(--text-2);">Validating link…</p>
            </div>

            <!-- Error -->
            <div v-else-if="tokenError" class="rounded-2xl p-8 text-center space-y-4"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                    style="background: var(--error-bg);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--error);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <div>
                    <p class="font-semibold mb-1" style="color: var(--text-1);">Link unavailable</p>
                    <p class="text-sm" style="color: var(--text-2);">{{ tokenError }}</p>
                </div>
                <NuxtLink to="/login"
                    class="inline-block px-5 py-2 rounded-full text-sm font-medium transition"
                    style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                    Go to sign in
                </NuxtLink>
            </div>

            <!-- Success -->
            <div v-else-if="done" class="rounded-2xl p-8 text-center space-y-4"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                    style="background: var(--success-bg);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--success);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <p class="font-semibold mb-1" style="color: var(--text-1);">{{ doneMessage }}</p>
                    <p class="text-sm" style="color: var(--text-3);">Redirecting to sign in…</p>
                </div>
            </div>

            <!-- Password Reset -->
            <div v-else-if="tokenData?.type === 'password_reset'" class="rounded-2xl p-8"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-1);">Reset Password</h2>
                    <p v-if="tokenData.targetEmail" class="text-sm" style="color: var(--text-2);">
                        For <span style="color: var(--text-1);">{{ tokenData.targetEmail }}</span>
                    </p>
                </div>
                <form @submit.prevent="submit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">New Password</label>
                        <input v-model="form.password" type="password" required minlength="8" autofocus
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Minimum 8 characters"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Confirm Password</label>
                        <input v-model="form.confirm" type="password" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Repeat password"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div v-if="submitError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ submitError }}
                    </div>
                    <button type="submit" :disabled="submitting"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!submitting && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                        {{ submitting ? 'Saving…' : 'Set New Password' }}
                    </button>
                </form>
            </div>

            <!-- Invite (new account) -->
            <div v-else-if="tokenData?.type === 'invite'" class="rounded-2xl p-8"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-1);">Create Account</h2>
                    <p v-if="tokenData.label" class="text-sm" style="color: var(--text-2);">{{ tokenData.label }}</p>
                </div>
                <form @submit.prevent="submit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="form.name" type="text" required autofocus
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Your name"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="form.email" type="email" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="your@email.com"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password</label>
                        <input v-model="form.password" type="password" required minlength="8"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Minimum 8 characters"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>
                    <div v-if="submitError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ submitError }}
                    </div>
                    <button type="submit" :disabled="submitting"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!submitting && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
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
        if (res.data?.accessToken) setAuthToken(res.data.accessToken)
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
