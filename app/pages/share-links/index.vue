<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar title="Share Links" :showBack="true" />

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 class="text-3xl font-bold text-white mb-2">Share Links</h2>
                    <p class="text-purple-200">Manage your shared albums and groups</p>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="text-center py-12">
                <div class="animate-pulse text-purple-300 text-xl">Loading links...</div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
                <p class="text-red-200">{{ error }}</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="links.length === 0" class="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <div class="text-5xl mb-4">🔗</div>
                <h3 class="text-xl font-bold text-white mb-2">No share links yet</h3>
                <p class="text-purple-200 mb-6">Create a share link from your albums to see it here.</p>
                <button @click="navigateTo('/album')"
                    class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                    Go to Albums
                </button>
            </div>

            <!-- Links Table -->
            <div v-else class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-purple-200">
                        <thead class="bg-white/5 text-purple-100 uppercase font-semibold">
                            <tr>
                                <th class="px-6 py-4">Link Label</th>
                                <th class="px-6 py-4">Target</th>
                                <th class="px-6 py-4">Type</th>
                                <th class="px-6 py-4 text-center">Views</th>
                                <th class="px-6 py-4">Created</th>
                                <th class="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            <tr v-for="link in links" :key="link.id" class="hover:bg-white/5 transition-colors group">
                                <td class="px-6 py-4 font-medium text-white">
                                    <div class="flex items-center gap-2">
                                        <span v-if="link.hasPassword" title="Password Protected">🔒</span>
                                        {{ link.label || 'No Label' }}
                                    </div>
                                    <div class="text-xs text-purple-400 mt-1 font-mono truncate max-w-[200px]">
                                        {{ getFullUrl(link.url) }}
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="font-medium text-white mb-1">{{ link.targetName }}</div>
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                        :class="link.targetType === 'Group' ? 'bg-indigo-500/20 text-indigo-200' : 'bg-pink-500/20 text-pink-200'">
                                        {{ link.targetType }}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="capitalize">{{ link.type }}</span>
                                </td>
                                <td class="px-6 py-4 text-center">
                                    {{ link.views }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    {{ formatDate(link.createdAt) }}
                                </td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button @click="copyLink(link.id, link.url)"
                                        class="text-purple-300 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
                                        title="Copy Link">
                                        <span v-if="copiedLinkId === link.id" class="text-green-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                                viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button @click="confirmDelete(link)"
                                        class="text-red-400 hover:text-red-200 transition p-2 hover:bg-red-500/10 rounded-lg"
                                        title="Delete Link">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-sm w-full shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-4">Delete Share Link?</h3>
                <p class="text-purple-200 mb-6">
                    Are you sure you want to delete this link? This action cannot be undone and anyone with the link
                    will strictly lose access.
                </p>
                <div class="flex space-x-3">
                    <button @click="showDeleteModal = false"
                        class="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Cancel
                    </button>
                    <button @click="handleDelete" :disabled="deleting"
                        class="flex-1 px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ deleting ? 'Deleting...' : 'Delete' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface ShareLink {
    id: string
    token: string
    type: string
    targetType: 'Group' | 'Album'
    targetName: string
    label: string | null
    views: number
    createdAt: number
    expiresAt: number | null
    hasPassword: boolean
    url: string
}

const loading = ref(true)
const error = ref('')
const links = ref<ShareLink[]>([])

const showDeleteModal = ref(false)
const linkToDelete = ref<ShareLink | null>(null)
const deleting = ref(false)

const copiedLinkId = ref<string | null>(null)

// Fetch Links
const fetchLinks = async () => {
    loading.value = true
    try {
        const response = await $fetch<{ success: boolean; data: ShareLink[] }>('/api/v1/share-links')
        links.value = response.data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to load share links'
    } finally {
        loading.value = false
    }
}

// Helpers
const getFullUrl = (path: string) => {
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const copyLink = async (id: string, path: string) => {
    const url = getFullUrl(path)
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url)
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement("textarea")
            textArea.value = url

            // Ensure element is not visible but part of DOM
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            textArea.style.top = "0"
            document.body.appendChild(textArea)

            textArea.focus()
            textArea.select()

            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)

            if (!successful) {
                throw new Error('Unable to copy')
            }
        }

        // Success feedback
        copiedLinkId.value = id
        setTimeout(() => {
            copiedLinkId.value = null
        }, 2000)

    } catch (err) {
        console.error('Failed to copy: ', err)
        alert('Failed to copy link manually: ' + url)
    }
}

// Delete Logic
const confirmDelete = (link: ShareLink) => {
    linkToDelete.value = link
    showDeleteModal.value = true
}

const handleDelete = async () => {
    if (!linkToDelete.value) return
    deleting.value = true

    try {
        await $fetch(`/api/v1/share-links/${linkToDelete.value.id}`, { method: 'DELETE' })
        // Remove from list locally
        links.value = links.value.filter(l => l.id !== linkToDelete.value?.id)
        showDeleteModal.value = false
        linkToDelete.value = null
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete link')
    } finally {
        deleting.value = false
    }
}

onMounted(() => {
    fetchLinks()
})
</script>
