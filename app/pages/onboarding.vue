<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="rounded-2xl p-8 max-w-md w-full"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <!-- Header -->
            <div class="text-center mb-8">
                <!-- Instagram Logo -->
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                    style="background: var(--accent-light);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
                        style="color: var(--accent);">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold mb-2" style="color: var(--text-1);">Welcome to PicHaus</h1>
                <p class="text-sm" style="color: var(--text-2);">
                    Let's complete your profile setup.
                </p>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSave" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Instagram Username (Optional)</label>
                    <div class="relative">
                        <span class="absolute left-3.5 top-2.5 text-sm" style="color: var(--text-3);">@</span>
                        <input v-model="instagram" type="text"
                            class="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="username"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <p class="text-xs mt-2" style="color: var(--text-3);">
                        Used to credit your photos automatically when you upload to shared albums.
                    </p>
                </div>

                <div class="flex flex-col gap-2.5 pt-2">
                    <button type="submit" :disabled="saving"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!saving && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <div v-if="saving" class="w-4 h-4 rounded-full border-2 animate-spin"
                            style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></div>
                        <span>{{ saving ? 'Saving…' : 'Save & Continue' }}</span>
                    </button>
                    
                    <button type="button" @click="handleSkip" :disabled="saving"
                        class="w-full py-2.5 rounded-full text-sm font-semibold transition"
                        style="color: var(--text-2); border: 1px solid var(--separator); background: transparent;"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                        Skip
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDialog } from '~/composables/useDialog'
import { useSiteSettings } from '~/composables/useSiteSettings'

definePageMeta({
    middleware: 'auth'
})

const route = useRoute()
const dialog = useDialog()
const { loadSettings, settings } = useSiteSettings()

const instagram = ref('')
const saving = ref(false)

const redirectUrl = computed(() => {
    const r = route.query.redirect
    return typeof r === 'string' && r.startsWith('/') ? r : '/album'
})

onMounted(async () => {
    await loadSettings()
})

async function handleSave() {
    saving.value = true
    try {
        let handle = instagram.value.trim()
        if (handle.startsWith('@')) {
            handle = handle.slice(1).trim()
        }

        if (handle) {
            await $fetch('/api/v1/users/me', {
                method: 'PATCH',
                body: { instagram: handle }
            })
        }
        
        await navigateTo(redirectUrl.value)
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to save settings. Please try again.')
    } finally {
        saving.value = false
    }
}

async function handleSkip() {
    await navigateTo(redirectUrl.value)
}
</script>
