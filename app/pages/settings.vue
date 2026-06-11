<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="Settings" :show-back="true" back-text="Back to Albums" back-to="/album" />

        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <!-- Profile -->
            <div class="rounded-2xl p-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <h2 class="text-xl font-bold mb-6" style="color: var(--text-1);">Profile Settings</h2>

                <!-- Avatar Upload -->
                <div class="flex items-center gap-5 mb-6 pb-6" style="border-bottom: 1px solid var(--separator);">
                    <div class="relative shrink-0">
                        <div class="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                            style="background: var(--accent-light);">
                            <img v-if="avatarPreview || form.currentAvatar" :src="avatarPreview || form.currentAvatar"
                                class="w-full h-full object-cover" alt="Profile picture" />
                            <span v-else class="text-2xl font-bold" style="color: var(--accent);">
                                {{ (form.name || '?')[0]?.toUpperCase() }}
                            </span>
                        </div>
                        <label class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition"
                            style="background: var(--accent); color: white; box-shadow: var(--shadow-sm);"
                            @mouseover="$event.currentTarget.style.background = 'var(--accent-hover)'"
                            @mouseout="$event.currentTarget.style.background = 'var(--accent)'"
                            title="Upload photo">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                                class="sr-only" @change="handleAvatarSelect" />
                        </label>
                    </div>
                    <div>
                        <p class="font-medium text-sm mb-0.5" style="color: var(--text-1);">Profile Photo</p>
                        <p class="text-xs" style="color: var(--text-3);">JPEG, PNG, WebP or GIF · Max 5 MB</p>
                        <div v-if="avatarUploading" class="text-xs mt-1.5 flex items-center gap-1.5" style="color: var(--accent);">
                            <div class="w-3 h-3 rounded-full border animate-spin" style="border-color: rgba(0,113,227,0.3); border-top-color: var(--accent);"></div>
                            Uploading…
                        </div>
                        <div v-else-if="avatarError" class="text-xs mt-1.5" style="color: var(--error);">{{ avatarError }}</div>
                        <div v-else-if="avatarSuccess" class="text-xs mt-1.5" style="color: var(--success-text);">Photo updated!</div>
                    </div>
                </div>

                <form @submit.prevent="handleSave" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="form.name" type="text" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="form.email" type="email" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Instagram (Optional)</label>
                        <div class="relative">
                            <span class="absolute left-3.5 top-2.5 text-sm" style="color: var(--text-3);">@</span>
                            <input v-model="form.instagram" type="text"
                                class="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="username"
                                @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                        </div>
                    </div>

                    <div class="pt-4" style="border-top: 1px solid var(--separator);">
                        <h3 class="text-base font-semibold mb-1" style="color: var(--text-1);">Change Password</h3>
                        <p class="text-sm mb-3" style="color: var(--text-3);">Leave blank to keep your current password.</p>
                        <input v-model="form.password" type="password" minlength="6"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="••••••••"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>

                    <div v-if="error" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ error }}
                    </div>
                    <div v-if="success" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text);">
                        {{ success }}
                    </div>

                    <div class="flex justify-end pt-2">
                        <button type="submit" :disabled="saving"
                            class="px-6 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!saving && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                            @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                            {{ saving ? 'Saving…' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Passkeys & Security Keys -->
            <div class="rounded-2xl p-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="flex items-start justify-between mb-6">
                    <div>
                        <h2 class="text-xl font-bold" style="color: var(--text-1);">Passkeys &amp; Security Keys</h2>
                        <p class="text-sm mt-1" style="color: var(--text-2);">
                            Sign in with Touch ID, Face ID, Windows Hello, YubiKey, or any FIDO2 authenticator.
                            No password needed.
                        </p>
                    </div>
                    <button @click="startRegister" :disabled="pkRegistering"
                        class="shrink-0 ml-4 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!pkRegistering && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{{ pkRegistering ? 'Registering…' : 'Add' }}</span>
                    </button>
                </div>

                <!-- Name prompt -->
                <div v-if="showNamePrompt" class="mb-5 p-4 rounded-2xl space-y-3"
                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <p class="text-sm font-medium" style="color: var(--text-1);">Give this key a name (optional)</p>
                    <input v-model="newKeyName" type="text" maxlength="40"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="e.g. YubiKey 5, MacBook Touch ID"
                        @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'"
                        @keydown.enter.prevent="confirmRegister"
                        @keydown.escape="showNamePrompt = false" />
                    <div class="flex gap-2">
                        <button @click="confirmRegister" :disabled="pkRegistering"
                            class="px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);">
                            Continue
                        </button>
                        <button @click="showNamePrompt = false"
                            class="px-4 py-2 rounded-full text-sm transition"
                            style="background: var(--surface-3); color: var(--text-1); border: 1px solid var(--separator);">
                            Cancel
                        </button>
                    </div>
                </div>

                <div v-if="pkError" class="mb-4 rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ pkError }}
                </div>
                <div v-if="pkSuccess" class="mb-4 rounded-xl px-4 py-3 text-sm"
                    style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text);">
                    {{ pkSuccess }}
                </div>

                <!-- Passkey list -->
                <div v-if="pkLoading" class="py-6 text-center text-sm animate-pulse" style="color: var(--text-3);">
                    Loading…
                </div>
                <div v-else-if="passkeys.length === 0"
                    class="py-8 text-center text-sm rounded-xl"
                    style="color: var(--text-3); border: 1px dashed var(--separator);">
                    No passkeys registered yet. Click <strong style="color: var(--text-1);">Add</strong> to register one.
                </div>
                <ul v-else class="space-y-3">
                    <li v-for="pk in passkeys" :key="pk.id"
                        class="flex items-center justify-between gap-4 p-4 rounded-xl"
                        style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                                :style="isHardwareKey(pk) ? 'background: var(--warning-bg); color: var(--warning-text);' : 'background: var(--accent-light); color: var(--accent);'">
                                <svg v-if="isHardwareKey(pk)" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                                </svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-4 0a6 6 0 1112 0c0 3.31-2.69 6-6 6s-6-2.69-6-6z" />
                                </svg>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-medium truncate" style="color: var(--text-1);">{{ pk.name }}</p>
                                <div class="flex flex-wrap gap-1.5 mt-0.5">
                                    <span v-for="t in pk.transports" :key="t"
                                        class="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                                        style="background: var(--surface-3); color: var(--text-3);">
                                        {{ transportLabel(t) }}
                                    </span>
                                    <span v-if="pk.backedUp"
                                        class="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                                        style="background: var(--accent-light); color: var(--accent);">
                                        Synced
                                    </span>
                                </div>
                                <p class="text-xs mt-0.5" style="color: var(--text-3);">
                                    Added {{ formatDate(pk.createdAt) }}
                                    <span v-if="pk.lastUsedAt"> · Last used {{ formatDate(pk.lastUsedAt) }}</span>
                                </p>
                            </div>
                        </div>
                        <button @click="removePasskey(pk.id)"
                            class="shrink-0 px-3 py-1.5 text-xs rounded-full transition"
                            style="background: var(--error-bg); color: var(--error-text); border: 1px solid var(--error-border);">
                            Remove
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const form = ref({ name: '', email: '', instagram: '', password: '', currentAvatar: '' as string | null })
const saving = ref(false)
const error = ref('')
const success = ref('')

// Avatar state
const avatarPreview = ref('')
const avatarUploading = ref(false)
const avatarError = ref('')
const avatarSuccess = ref(false)

const handleAvatarSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
        avatarError.value = 'File too large. Max 5 MB.'
        return
    }

    avatarPreview.value = URL.createObjectURL(file)
    avatarError.value = ''
    avatarSuccess.value = false
    avatarUploading.value = true

    try {
        const fd = new FormData()
        fd.append('avatar', file)
        const res = await $fetch<{ success: boolean; data: { avatarUrl: string } }>('/api/v1/users/avatar', {
            method: 'POST',
            body: fd,
        })
        form.value.currentAvatar = res.data.avatarUrl
        avatarSuccess.value = true
        setTimeout(() => { avatarSuccess.value = false }, 3000)
    } catch (err: any) {
        avatarError.value = err.data?.statusMessage || 'Upload failed'
        avatarPreview.value = ''
    } finally {
        avatarUploading.value = false
        input.value = ''
    }
}

onMounted(async () => {
    try {
        const res = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        if (res?.data) {
            form.value.name = res.data.name || ''
            form.value.email = res.data.email || ''
            form.value.instagram = res.data.instagram || ''
            form.value.currentAvatar = res.data.avatar || null
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
