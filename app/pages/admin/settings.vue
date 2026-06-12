<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Site Settings" />

        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
                                @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
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
                                    @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                    @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
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
                        @mouseover="!saving && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
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

const form = ref({
    siteName: 'PicHaus',
    accentColor: '',
    logoImageId: null as string | null,
    allowRegistration: false,
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
