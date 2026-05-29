<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar title="Settings" :show-back="true" back-text="Back to Albums" back-to="/album" />

        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <!-- Profile -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h2 class="text-2xl font-bold text-white mb-6">Profile Settings</h2>

                <form @submit.prevent="handleSave" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Name</label>
                        <input v-model="form.name" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
                        <input v-model="form.email" type="email" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Instagram (Optional)</label>
                        <div class="relative">
                            <span class="absolute left-4 top-3.5 text-white/40">@</span>
                            <input v-model="form.instagram" type="text"
                                class="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                                placeholder="username" />
                        </div>
                    </div>

                    <div class="border-t border-white/10 pt-6">
                        <h3 class="text-xl font-bold text-white mb-1">Change Password</h3>
                        <p class="text-white/50 text-sm mb-4">Leave blank to keep your current password.</p>
                        <input v-model="form.password" type="password" minlength="6"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="••••••••" />
                    </div>

                    <div v-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ error }}</p>
                    </div>
                    <div v-if="success" class="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                        <p class="text-green-200 text-sm">{{ success }}</p>
                    </div>

                    <div class="flex justify-end pt-2">
                        <button type="submit" :disabled="saving"
                            class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ saving ? 'Saving...' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Passkeys & Security Keys -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <div class="flex items-start justify-between mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Passkeys &amp; Security Keys</h2>
                        <p class="text-[var(--text-muted)] text-sm mt-1">
                            Sign in with Touch ID, Face ID, Windows Hello, YubiKey, or any FIDO2 authenticator.
                            No password needed.
                        </p>
                    </div>
                    <button @click="startRegister"
                        :disabled="pkRegistering"
                        class="shrink-0 ml-4 px-4 py-2 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{{ pkRegistering ? 'Registering…' : 'Add' }}</span>
                    </button>
                </div>

                <!-- Name prompt (shown before triggering browser UI) -->
                <div v-if="showNamePrompt" class="mb-5 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <p class="text-sm text-white font-medium">Give this key a name (optional)</p>
                    <input v-model="newKeyName" type="text" maxlength="40"
                        class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        placeholder="e.g. YubiKey 5, MacBook Touch ID"
                        @keydown.enter.prevent="confirmRegister"
                        @keydown.escape="showNamePrompt = false" />
                    <div class="flex gap-2">
                        <button @click="confirmRegister" :disabled="pkRegistering"
                            class="px-4 py-2 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
                            Continue
                        </button>
                        <button @click="showNamePrompt = false"
                            class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg transition">
                            Cancel
                        </button>
                    </div>
                </div>

                <div v-if="pkError" class="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p class="text-red-200 text-sm">{{ pkError }}</p>
                </div>
                <div v-if="pkSuccess" class="mb-4 bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                    <p class="text-green-200 text-sm">{{ pkSuccess }}</p>
                </div>

                <!-- Passkey list -->
                <div v-if="pkLoading" class="py-6 text-center text-[var(--text-muted)] animate-pulse text-sm">
                    Loading…
                </div>
                <div v-else-if="passkeys.length === 0"
                    class="py-8 text-center text-[var(--text-muted)] text-sm border border-dashed border-white/10 rounded-xl">
                    No passkeys registered yet. Click <strong class="text-white">Add</strong> to register one.
                </div>
                <ul v-else class="space-y-3">
                    <li v-for="pk in passkeys" :key="pk.id"
                        class="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div class="flex items-center gap-3 min-w-0">
                            <!-- Icon: key for hardware (usb/nfc/ble), fingerprint for platform -->
                            <div class="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                                :class="isHardwareKey(pk) ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'">
                                <svg v-if="isHardwareKey(pk)" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                                </svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-4 0a6 6 0 1112 0c0 3.31-2.69 6-6 6s-6-2.69-6-6z" />
                                </svg>
                            </div>
                            <div class="min-w-0">
                                <p class="text-white text-sm font-medium truncate">{{ pk.name }}</p>
                                <div class="flex flex-wrap gap-1.5 mt-0.5">
                                    <span v-for="t in pk.transports" :key="t"
                                        class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 uppercase tracking-wide">
                                        {{ transportLabel(t) }}
                                    </span>
                                    <span v-if="pk.backedUp"
                                        class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                                        Synced
                                    </span>
                                </div>
                                <p class="text-[var(--text-muted)] text-xs mt-0.5">
                                    Added {{ formatDate(pk.createdAt) }}
                                    <span v-if="pk.lastUsedAt"> · Last used {{ formatDate(pk.lastUsedAt) }}</span>
                                </p>
                            </div>
                        </div>
                        <button @click="removePasskey(pk.id)"
                            class="shrink-0 px-3 py-1.5 text-xs text-red-300 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition">
                            Remove
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const form = ref({ name: '', email: '', instagram: '', password: '' })
const saving = ref(false)
const error = ref('')
const success = ref('')

onMounted(async () => {
    try {
        const res = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        if (res?.data) {
            form.value.name = res.data.name || ''
            form.value.email = res.data.email || ''
            form.value.instagram = res.data.instagram || ''
        } else {
            navigateTo('/login')
        }
    } catch {
        navigateTo('/login')
    }
    loadPasskeys()
})

const handleSave = async () => {
    saving.value = true; error.value = ''; success.value = ''
    try {
        const body: any = { name: form.value.name, email: form.value.email, instagram: form.value.instagram }
        if (form.value.password) body.password = form.value.password
        await $fetch('/api/v1/users/me', { method: 'PATCH', body })
        success.value = 'Profile updated successfully'
        form.value.password = ''
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to update profile'
    } finally {
        saving.value = false
    }
}

// ── Passkeys ────────────────────────────────────────────────────────────────

interface PasskeyItem {
    id: string
    name: string
    transports: string[]
    deviceType: string
    backedUp: boolean
    createdAt: number
    lastUsedAt: number | null
}

const passkeys = ref<PasskeyItem[]>([])
const pkLoading = ref(true)
const pkRegistering = ref(false)
const pkError = ref('')
const pkSuccess = ref('')
const showNamePrompt = ref(false)
const newKeyName = ref('')

const isHardwareKey = (pk: PasskeyItem) =>
    pk.transports.some(t => ['usb', 'nfc', 'ble', 'smart-card'].includes(t))

const transportLabel = (t: string) => ({
    usb: 'USB', nfc: 'NFC', ble: 'Bluetooth', 'smart-card': 'Smart Card',
    hybrid: 'Hybrid', internal: 'Built-in',
}[t] ?? t)

const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const loadPasskeys = async () => {
    pkLoading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: PasskeyItem[] }>('/api/v1/auth/passkey')
        passkeys.value = res.data
    } catch { /* ignore */ } finally {
        pkLoading.value = false
    }
}

const startRegister = () => {
    pkError.value = ''; pkSuccess.value = ''
    newKeyName.value = ''
    showNamePrompt.value = true
}

const confirmRegister = async () => {
    showNamePrompt.value = false
    pkRegistering.value = true
    pkError.value = ''
    try {
        const { startRegistration } = await import('@simplewebauthn/browser')

        const optRes = await $fetch<{ success: boolean; data: { options: any; challengeId: string } }>(
            '/api/v1/auth/passkey/register-options', { method: 'POST' }
        )

        const regResponse = await startRegistration({ optionsJSON: optRes.data.options })

        await $fetch('/api/v1/auth/passkey/register-verify', {
            method: 'POST',
            body: { response: regResponse, challengeId: optRes.data.challengeId, name: newKeyName.value.trim() || undefined },
        })

        pkSuccess.value = 'Passkey registered successfully!'
        await loadPasskeys()
    } catch (err: any) {
        if (err?.name === 'NotAllowedError') return  // User cancelled
        pkError.value = err?.data?.statusMessage || err?.message || 'Registration failed'
    } finally {
        pkRegistering.value = false
        newKeyName.value = ''
    }
}

const removePasskey = async (id: string) => {
    if (!confirm('Remove this passkey? You won\'t be able to use it to sign in anymore.')) return
    try {
        await $fetch(`/api/v1/auth/passkey/${id}`, { method: 'DELETE' })
        passkeys.value = passkeys.value.filter(p => p.id !== id)
        pkSuccess.value = 'Passkey removed.'
    } catch (err: any) {
        pkError.value = err?.data?.statusMessage || 'Failed to remove passkey'
    }
}
</script>
