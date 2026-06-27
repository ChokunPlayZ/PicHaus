<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Site Settings" />

        <div class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">Site Settings</h1>

            <div v-if="loading" class="flex justify-center py-12">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
            </div>

            <template v-else>
                <!-- Branding -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-lg font-bold mb-5" style="color: var(--text-1);">Branding</h2>

                    <div class="space-y-5">
                        <!-- Site Name -->
                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Site Name</label>
                            <input v-model="form.siteName" type="text" placeholder="PicHaus"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            <p class="text-xs mt-1" style="color: var(--text-3);">Appears in the navbar and browser tab title</p>
                        </div>

                        <!-- Accent Color -->
                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Accent Color</label>
                            <div class="flex items-center gap-3">
                                <div class="relative">
                                    <input type="color" v-model="form.accentColor"
                                        class="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5"
                                        style="background: var(--surface-2); border: 1px solid var(--separator);" />
                                </div>
                                <input v-model="form.accentColor" type="text" placeholder="#0071e3" maxlength="7"
                                    class="w-32 px-3 py-2 text-sm rounded-xl transition font-mono"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                    @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                                <button v-if="form.accentColor" @click="form.accentColor = ''"
                                    class="px-3 py-2 rounded-xl text-xs font-medium transition"
                                    style="background: var(--surface-3); color: var(--text-2);">
                                    Reset
                                </button>
                                <div class="w-10 h-10 rounded-xl border flex-shrink-0"
                                    :style="{ background: form.accentColor || 'var(--accent)', borderColor: 'var(--separator)' }"></div>
                            </div>
                            <p class="text-xs mt-1" style="color: var(--text-3);">Leave empty for the default Apple blue (#0071e3)</p>
                        </div>

                        <!-- Site Logo -->
                        <div>
                            <label class="block text-sm font-medium mb-2" style="color: var(--text-2);">Site Logo</label>
                            <div v-if="logos.length === 0 && !form.logoImageId" class="text-sm" style="color: var(--text-3);">
                                No logos uploaded yet. Go to an album's Edit modal to upload logos.
                            </div>
                            <div v-else>
                                <div class="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1">
                                    <!-- None option -->
                                    <button type="button"
                                        @click="form.logoImageId = null"
                                        :class="['rounded-xl h-14 border-2 flex items-center justify-center transition text-xs font-medium',
                                            !form.logoImageId ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-transparent hover:border-[var(--separator)]']"
                                        style="background: var(--surface-2);">
                                        <span style="color: var(--text-3);">None</span>
                                    </button>
                                    <button v-for="logo in logos" :key="logo.id" type="button"
                                        @click="form.logoImageId = logo.id"
                                        :class="['rounded-xl h-14 overflow-hidden border-2 transition p-1',
                                            form.logoImageId === logo.id ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--separator)]']">
                                        <img :src="`/api/assets/logo/${logo.id}`" :alt="logo.originalName"
                                            class="w-full h-full object-contain" />
                                    </button>
                                </div>
                                <p v-if="form.logoImageId" class="text-xs mt-1" style="color: var(--text-3);">
                                    Logo will appear in the navbar for all users
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Access Control -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-lg font-bold mb-5" style="color: var(--text-1);">Access Control</h2>
                    <label class="flex items-start gap-3 cursor-pointer">
                        <input v-model="form.allowRegistration" type="checkbox"
                            class="mt-0.5 w-4 h-4 rounded" style="accent-color: var(--accent);" />
                        <div>
                            <p class="text-sm font-medium" style="color: var(--text-1);">Allow public registration</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">When disabled, new accounts can only be created via admin invite links</p>
                        </div>
                    </label>
                </div>

                <!-- Google Sign-In -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-lg font-bold mb-1" style="color: var(--text-1);">Google Sign-In</h2>
                    <p class="text-sm mb-5" style="color: var(--text-3);">
                        Requires <code class="px-1 py-0.5 rounded text-xs" style="background: var(--surface-3);">GOOGLE_CLIENT_ID</code> and
                        <code class="px-1 py-0.5 rounded text-xs" style="background: var(--surface-3);">GOOGLE_CLIENT_SECRET</code> environment variables.
                    </p>

                    <div v-if="!googleClientIdConfigured" class="rounded-xl px-4 py-3 text-sm mb-4"
                        style="background: #fef3c7; border: 1px solid #fcd34d; color: #92400e;">
                        GOOGLE_CLIENT_ID is not set. Configure the env vars to enable Google sign-in.
                    </div>

                    <div class="space-y-4">
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input v-model="form.googleOAuthEnabled" type="checkbox" :disabled="!googleClientIdConfigured"
                                class="mt-0.5 w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <div>
                                <p class="text-sm font-medium" style="color: var(--text-1);">Enable Google Sign-In</p>
                                <p class="text-xs mt-0.5" style="color: var(--text-3);">Show "Sign in with Google" on login and upload pages</p>
                            </div>
                        </label>

                        <div v-if="form.googleOAuthEnabled">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Allowed Email Domain</label>
                            <input v-model="form.googleOAuthAllowedDomain" type="text" placeholder="e.g. tni.ac.th"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            <p class="text-xs mt-1" style="color: var(--text-3);">Leave empty to allow any Google account. Set to e.g. <code>tni.ac.th</code> to restrict to one domain.</p>
                        </div>

                        <label v-if="form.googleOAuthEnabled && form.googleOAuthAllowedDomain" class="flex items-start gap-3 cursor-pointer">
                            <input v-model="form.googleOAuthShiftBypassEnabled" type="checkbox"
                                class="mt-0.5 w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <div>
                                <p class="text-sm font-medium" style="color: var(--text-1);">Allow Shift+Click to bypass domain lock</p>
                                <p class="text-xs mt-0.5" style="color: var(--text-3);">When enabled, holding Shift while clicking the sign-in button lets any Google account sign in, regardless of the domain restriction.</p>
                            </div>
                        </label>

                        <div v-if="form.googleOAuthEnabled">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Button Label <span style="color: var(--text-3); font-weight: 400;">(optional)</span></label>
                            <input v-model="form.googleButtonText" type="text" placeholder="Sign in with Google"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            <p class="text-xs mt-1" style="color: var(--text-3);">Shown on login and upload pages. E.g. "Login with TNI ID".</p>
                        </div>

                        <div v-if="form.googleOAuthEnabled">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Button Logo <span style="color: var(--text-3); font-weight: 400;">(optional)</span></label>
                            <div class="flex flex-wrap gap-2">
                                <button type="button"
                                    :class="['px-3 py-1.5 text-xs rounded-lg border transition', !form.googleButtonLogoId ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-transparent hover:border-[var(--separator)]']"
                                    :style="!form.googleButtonLogoId ? 'color: var(--accent)' : 'color: var(--text-2)'"
                                    @click="form.googleButtonLogoId = null">
                                    Default (Google)
                                </button>
                                <button v-for="logo in logos" :key="logo.id" type="button"
                                    :class="['px-2 py-1 rounded-lg border transition flex items-center gap-1.5', form.googleButtonLogoId === logo.id ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--separator)]']"
                                    @click="form.googleButtonLogoId = logo.id">
                                    <img :src="`/api/assets/logo/${logo.id}`" class="w-5 h-5 object-contain rounded" />
                                    <span class="text-xs" style="color: var(--text-2);">{{ logo.originalName }}</span>
                                </button>
                            </div>
                            <p v-if="form.googleButtonLogoId" class="text-xs mt-1" style="color: var(--text-3);">Custom logo selected. Upload more logos above.</p>
                        </div>

                        <div v-if="form.googleOAuthEnabled" class="rounded-xl p-3 text-xs" style="background: var(--surface-2); color: var(--text-3);">
                            <p class="font-medium mb-1" style="color: var(--text-2);">Google Cloud Console setup:</p>
                            <ol class="list-decimal list-inside space-y-0.5">
                                <li>Create OAuth 2.0 credentials at console.cloud.google.com</li>
                                <li>Add authorized redirect URI: <code class="font-mono">https://your-domain/api/v1/auth/google/callback</code></li>
                                <li>Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars and restart the server</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <!-- Microsoft Sign-In -->
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-lg font-bold mb-1" style="color: var(--text-1);">Microsoft Sign-In</h2>
                    <p class="text-sm mb-5" style="color: var(--text-3);">
                        Requires <code class="px-1 py-0.5 rounded text-xs" style="background: var(--surface-3);">MICROSOFT_CLIENT_ID</code> and
                        <code class="px-1 py-0.5 rounded text-xs" style="background: var(--surface-3);">MICROSOFT_CLIENT_SECRET</code> environment variables.
                    </p>

                    <div v-if="!microsoftClientIdConfigured" class="rounded-xl px-4 py-3 text-sm mb-4"
                        style="background: #fef3c7; border: 1px solid #fcd34d; color: #92400e;">
                        MICROSOFT_CLIENT_ID is not set. Configure the env vars to enable Microsoft sign-in.
                    </div>

                    <div class="space-y-4">
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input v-model="form.microsoftOAuthEnabled" type="checkbox" :disabled="!microsoftClientIdConfigured"
                                class="mt-0.5 w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <div>
                                <p class="text-sm font-medium" style="color: var(--text-1);">Enable Microsoft Sign-In</p>
                                <p class="text-xs mt-0.5" style="color: var(--text-3);">Show "Sign in with Microsoft" on login and upload pages</p>
                            </div>
                        </label>

                        <div v-if="form.microsoftOAuthEnabled">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Tenant ID <span style="color: var(--text-3); font-weight: 400;">(optional)</span></label>
                            <input v-model="form.microsoftOAuthTenantId" type="text" placeholder="e.g. tni.ac.th or xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            <p class="text-xs mt-1" style="color: var(--text-3);">Leave empty to allow any Microsoft account. Set to your Entra ID tenant domain or GUID to restrict to your organization.</p>
                        </div>

                        <div v-if="form.microsoftOAuthEnabled">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Button Label <span style="color: var(--text-3); font-weight: 400;">(optional)</span></label>
                            <input v-model="form.microsoftButtonText" type="text" placeholder="Sign in with Microsoft"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div v-if="form.microsoftOAuthEnabled">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Button Logo <span style="color: var(--text-3); font-weight: 400;">(optional)</span></label>
                            <div class="flex flex-wrap gap-2">
                                <button type="button"
                                    :class="['px-3 py-1.5 text-xs rounded-lg border transition', !form.microsoftButtonLogoId ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-transparent hover:border-[var(--separator)]']"
                                    :style="!form.microsoftButtonLogoId ? 'color: var(--accent)' : 'color: var(--text-2)'"
                                    @click="form.microsoftButtonLogoId = null">
                                    Default (Microsoft)
                                </button>
                                <button v-for="logo in logos" :key="logo.id" type="button"
                                    :class="['px-2 py-1 rounded-lg border transition flex items-center gap-1.5', form.microsoftButtonLogoId === logo.id ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--separator)]']"
                                    @click="form.microsoftButtonLogoId = logo.id">
                                    <img :src="`/api/assets/logo/${logo.id}`" class="w-5 h-5 object-contain rounded" />
                                    <span class="text-xs" style="color: var(--text-2);">{{ logo.originalName }}</span>
                                </button>
                            </div>
                        </div>

                        <div v-if="form.microsoftOAuthEnabled" class="rounded-xl p-3 text-xs" style="background: var(--surface-2); color: var(--text-3);">
                            <p class="font-medium mb-1" style="color: var(--text-2);">Azure / Entra ID setup:</p>
                            <ol class="list-decimal list-inside space-y-0.5">
                                <li>Register an app at portal.azure.com under App registrations</li>
                                <li>Add a Web redirect URI: <code class="font-mono">https://your-domain/api/v1/auth/microsoft/callback</code></li>
                                <li>Create a client secret under Certificates &amp; secrets</li>
                                <li>Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET env vars and restart the server</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <!-- Feedback -->
                <div v-if="saveError" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ saveError }}
                </div>
                <div v-if="saveSuccess" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text);">
                    Settings saved successfully
                </div>

                <div class="flex justify-end">
                    <button @click="save" :disabled="saving"
                        class="px-6 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!saving && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ saving ? 'Saving…' : 'Save Settings' }}
                    </button>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Logo { id: string; originalName: string }

const loading = ref(true)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)
const logos = ref<Logo[]>([])
const googleClientIdConfigured = ref(false)
const microsoftClientIdConfigured = ref(false)

const form = ref({
    siteName: 'PicHaus',
    accentColor: '',
    logoImageId: null as string | null,
    allowRegistration: false,
    googleOAuthEnabled: false,
    googleOAuthAllowedDomain: '',
    googleOAuthShiftBypassEnabled: false,
    googleButtonText: '',
    googleButtonLogoId: null as string | null,
    microsoftOAuthEnabled: false,
    microsoftOAuthTenantId: '',
    microsoftButtonText: '',
    microsoftButtonLogoId: null as string | null,
})

const { refreshSettings, applyAccent } = useSiteSettings()

onMounted(async () => {
    try {
        const [settingsRes, logosRes] = await Promise.all([
            $fetch<{ success: boolean; data: any }>('/api/v1/admin/site-settings'),
            $fetch<{ success: boolean; data: Logo[] }>('/api/v1/logos'),
        ])
        const s = settingsRes.data
        form.value.siteName = s.siteName
        form.value.accentColor = s.accentColor ?? ''
        form.value.logoImageId = s.logoImageId ?? null
        form.value.allowRegistration = s.allowRegistration
        form.value.googleOAuthEnabled = s.googleOAuthEnabled ?? false
        form.value.googleOAuthAllowedDomain = s.googleOAuthAllowedDomain ?? ''
        form.value.googleOAuthShiftBypassEnabled = s.googleOAuthShiftBypassEnabled ?? false
        form.value.googleButtonText = s.googleButtonText ?? ''
        form.value.googleButtonLogoId = s.googleButtonLogoId ?? null
        googleClientIdConfigured.value = s.googleClientIdConfigured ?? false
        form.value.microsoftOAuthEnabled = s.microsoftOAuthEnabled ?? false
        form.value.microsoftOAuthTenantId = s.microsoftOAuthTenantId ?? ''
        form.value.microsoftButtonText = s.microsoftButtonText ?? ''
        form.value.microsoftButtonLogoId = s.microsoftButtonLogoId ?? null
        microsoftClientIdConfigured.value = s.microsoftClientIdConfigured ?? false
        logos.value = logosRes.data
    } catch {
        saveError.value = 'Failed to load settings'
    } finally {
        loading.value = false
    }
})

// Live preview of accent color
watch(() => form.value.accentColor, (color) => {
    const isValid = /^#[0-9a-fA-F]{6}$/.test(color)
    applyAccent(isValid ? color : null)
})

const save = async () => {
    saveError.value = ''
    saveSuccess.value = false

    if (form.value.accentColor && !/^#[0-9a-fA-F]{6}$/.test(form.value.accentColor)) {
        saveError.value = 'Accent color must be a 6-digit hex like #0071e3'
        return
    }

    saving.value = true
    try {
        await $fetch('/api/v1/admin/site-settings', {
            method: 'PUT',
            body: {
                siteName: form.value.siteName,
                accentColor: form.value.accentColor || null,
                logoImageId: form.value.logoImageId,
                allowRegistration: form.value.allowRegistration,
                googleOAuthEnabled: form.value.googleOAuthEnabled,
                googleOAuthAllowedDomain: form.value.googleOAuthAllowedDomain || null,
                googleOAuthShiftBypassEnabled: form.value.googleOAuthShiftBypassEnabled,
                googleButtonText: form.value.googleButtonText || null,
                googleButtonLogoId: form.value.googleButtonLogoId,
                microsoftOAuthEnabled: form.value.microsoftOAuthEnabled,
                microsoftOAuthTenantId: form.value.microsoftOAuthTenantId || null,
                microsoftButtonText: form.value.microsoftButtonText || null,
                microsoftButtonLogoId: form.value.microsoftButtonLogoId,
            },
        })
        saveSuccess.value = true
        await refreshSettings()
        setTimeout(() => { saveSuccess.value = false }, 3000)
    } catch (err: any) {
        saveError.value = err.data?.statusMessage || 'Failed to save settings'
    } finally {
        saving.value = false
    }
}
</script>
