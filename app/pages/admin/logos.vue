<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Admin Dashboard" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">Logo Manager</h1>
                <label class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Logo
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        class="hidden" @change="handleUpload" :disabled="uploading" />
                </label>
            </div>

            <div v-if="loading" class="flex justify-center py-12">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
            </div>

            <div v-else-if="logos.length === 0" class="rounded-2xl p-12 text-center"
                style="background: var(--surface-1); border: 1px solid var(--separator);">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.5-1.5a2 2 0 012.8 0L20 14M8 6h.01M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
                <p class="text-sm" style="color: var(--text-3);">No logos uploaded yet. Upload one to use in albums, share groups, or site branding.</p>
            </div>

            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div v-for="logo in logos" :key="logo.id"
                    class="rounded-2xl overflow-hidden group"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <!-- Preview -->
                    <div class="relative aspect-square flex items-center justify-center p-4"
                        style="background: var(--surface-2);">
                        <img :src="logo.url" :alt="logo.originalName"
                            class="max-w-full max-h-full object-contain" style="max-height: 96px;" />
                        <button @click="confirmDelete(logo)"
                            class="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style="background: var(--error); color: #fff;"
                            title="Delete logo">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                    <!-- Info -->
                    <div class="px-3 py-2.5">
                        <p class="text-xs font-medium truncate mb-1" style="color: var(--text-1);" :title="logo.originalName">{{ logo.originalName }}</p>
                        <p class="text-xs mb-2" style="color: var(--text-3);">{{ formatDate(logo.uploadedAt) }}</p>

                        <!-- Usage badges -->
                        <div class="flex flex-wrap gap-1">
                            <span v-if="logo.usage.siteLogoActive"
                                class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style="background: var(--accent-light); color: var(--accent);">Site logo</span>
                            <span v-if="logo.usage.googleButtonActive"
                                class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style="background: var(--accent-light); color: var(--accent);">Google btn</span>
                            <span v-if="logo.usage.albumCount > 0"
                                class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style="background: var(--surface-3); color: var(--text-2);">
                                {{ logo.usage.albumCount }} album{{ logo.usage.albumCount !== 1 ? 's' : '' }}
                            </span>
                            <span v-if="logo.usage.groupCount > 0"
                                class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style="background: var(--surface-3); color: var(--text-2);">
                                {{ logo.usage.groupCount }} group{{ logo.usage.groupCount !== 1 ? 's' : '' }}
                            </span>
                            <span v-if="!isInUse(logo)"
                                class="px-1.5 py-0.5 rounded text-[10px]"
                                style="color: var(--text-3);">Unused</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const dialog = useDialog()

interface LogoUsage {
    siteLogoActive: boolean
    googleButtonActive: boolean
    albumCount: number
    groupCount: number
}

interface Logo {
    id: string
    originalName: string
    mimeType: string
    uploadedAt: number
    url: string
    usage: LogoUsage
}

const logos = ref<Logo[]>([])
const loading = ref(true)
const uploading = ref(false)

onMounted(async () => {
    try {
        const { data } = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        if (data?.role !== 'ADMIN') return navigateTo('/album')
    } catch {
        return navigateTo('/login')
    }
    await fetchLogos()
})

const fetchLogos = async () => {
    loading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: Logo[] }>('/api/v1/logos')
        if (res.success) logos.value = res.data
    } finally {
        loading.value = false
    }
}

const handleUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    ;(event.target as HTMLInputElement).value = ''

    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('file', file)
        await $fetch('/api/v1/logos', { method: 'POST', body: formData })
        await fetchLogos()
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Upload failed')
    } finally {
        uploading.value = false
    }
}

const confirmDelete = async (logo: Logo) => {
    const inUse = isInUse(logo)
    const usageLines: string[] = []
    if (logo.usage.siteLogoActive) usageLines.push('site logo')
    if (logo.usage.googleButtonActive) usageLines.push('Google sign-in button')
    if (logo.usage.albumCount > 0) usageLines.push(`${logo.usage.albumCount} album(s)`)
    if (logo.usage.groupCount > 0) usageLines.push(`${logo.usage.groupCount} share group(s)`)

    const warningText = inUse
        ? `This logo is currently used as: ${usageLines.join(', ')}. Those references will be cleared.`
        : ''

    if (!await dialog.confirm(
        `Delete "${logo.originalName}"?${warningText ? '\n\n' + warningText : ''}`,
        { danger: true }
    )) return

    try {
        await $fetch(`/api/v1/logos/${logo.id}`, { method: 'DELETE' })
        await fetchLogos()
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Delete failed')
    }
}

const isInUse = (logo: Logo) =>
    logo.usage.siteLogoActive || logo.usage.googleButtonActive ||
    logo.usage.albumCount > 0 || logo.usage.groupCount > 0

const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString()
</script>
