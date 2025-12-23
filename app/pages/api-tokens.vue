<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar title="API Tokens" :show-back="true" back-text="Back to Albums" back-to="/album" />

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Create New Token Section -->
            <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-8">
                <h2 class="text-2xl font-bold text-white mb-4">Create New API Token</h2>
                <p class="text-purple-200 text-sm mb-6">
                    API tokens allow external services to access your photos and albums.
                </p>

                <form @submit.prevent="handleCreateToken" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Token Name</label>
                        <input v-model="newToken.name" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., My Website Integration" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Permissions</label>
                        <div class="flex flex-wrap gap-3">
                            <label class="flex items-center gap-2 text-white cursor-pointer">
                                <input type="checkbox" v-model="newToken.scopes" value="photos:read"
                                    class="w-4 h-4 rounded bg-white/10 border-white/20" />
                                <span class="text-sm">Read Photos</span>
                            </label>
                            <label class="flex items-center gap-2 text-white cursor-pointer">
                                <input type="checkbox" v-model="newToken.scopes" value="albums:read"
                                    class="w-4 h-4 rounded bg-white/10 border-white/20" />
                                <span class="text-sm">Read Albums</span>
                            </label>
                        </div>
                    </div>

                    <div v-if="createError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ createError }}</p>
                    </div>

                    <button type="submit" :disabled="creating"
                        class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ creating ? 'Creating...' : 'Create Token' }}
                    </button>
                </form>
            </div>

            <!-- Newly Created Token Display -->
            <div v-if="createdToken" class="bg-green-500/20 border border-green-500/50 rounded-xl p-6 mb-8">
                <h3 class="text-xl font-bold text-white mb-2">🎉 Token Created!</h3>
                <p class="text-green-200 text-sm mb-4">
                    Copy this token now. You won't be able to see it again!
                </p>
                <div class="flex items-center gap-2">
                    <code class="flex-1 px-4 py-3 bg-black/30 rounded-lg text-green-300 font-mono text-sm break-all">
                        {{ createdToken }}
                    </code>
                    <button @click="copyToken"
                        class="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition whitespace-nowrap">
                        {{ copied ? '✓ Copied' : 'Copy' }}
                    </button>
                </div>
            </div>

            <!-- Existing Tokens List -->
            <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h2 class="text-2xl font-bold text-white mb-4">Your API Tokens</h2>

                <div v-if="loading" class="text-purple-300 animate-pulse">Loading tokens...</div>

                <div v-else-if="tokens.length === 0" class="text-purple-300">
                    You don't have any API tokens yet.
                </div>

                <div v-else class="space-y-4">
                    <div v-for="token in tokens" :key="token.id"
                        class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <h4 class="text-white font-medium">{{ token.name }}</h4>
                            <p class="text-purple-300 text-sm font-mono">{{ token.prefix }}</p>
                            <div class="flex gap-2 mt-1">
                                <span v-for="scope in token.scopes" :key="scope"
                                    class="text-xs px-2 py-0.5 bg-purple-500/30 rounded text-purple-200">
                                    {{ scope }}
                                </span>
                            </div>
                            <p class="text-white/40 text-xs mt-1">
                                Created: {{ formatDate(token.createdAt) }}
                                <span v-if="token.lastUsedAt"> · Last used: {{ formatDate(token.lastUsedAt) }}</span>
                            </p>
                        </div>
                        <button @click="revokeToken(token.id)"
                            class="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition text-sm">
                            Revoke
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface ApiToken {
    id: string
    name: string
    prefix: string
    scopes: string[]
    lastUsedAt: number | null
    expiresAt: number | null
    createdAt: number
}

const tokens = ref<ApiToken[]>([])
const loading = ref(true)
const creating = ref(false)
const createError = ref('')
const createdToken = ref('')
const copied = ref(false)

const newToken = ref({
    name: '',
    scopes: ['photos:read', 'albums:read']
})

// Load tokens
const loadTokens = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: ApiToken[] }>('/api/v1/api-tokens')
        tokens.value = response.data
    } catch (e) {
        console.error('Failed to load tokens', e)
    } finally {
        loading.value = false
    }
}

// Create token
const handleCreateToken = async () => {
    if (!newToken.value.name.trim()) return

    creating.value = true
    createError.value = ''
    createdToken.value = ''

    try {
        const response = await $fetch<{ success: boolean; data: { token: string } }>('/api/v1/api-tokens', {
            method: 'POST',
            body: {
                name: newToken.value.name,
                scopes: newToken.value.scopes
            }
        })

        createdToken.value = response.data.token
        newToken.value.name = ''

        // Reload tokens list
        await loadTokens()
    } catch (err: any) {
        createError.value = err.data?.statusMessage || 'Failed to create token'
    } finally {
        creating.value = false
    }
}

// Copy token
const copyToken = async () => {
    try {
        await navigator.clipboard.writeText(createdToken.value)
        copied.value = true
        setTimeout(() => copied.value = false, 2000)
    } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = createdToken.value
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        copied.value = true
        setTimeout(() => copied.value = false, 2000)
    }
}

// Revoke token
const revokeToken = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) return

    try {
        await $fetch(`/api/v1/api-tokens/${id}`, { method: 'DELETE' })
        tokens.value = tokens.value.filter(t => t.id !== id)
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to revoke token')
    }
}

// Format date
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

onMounted(async () => {
    // Check auth
    try {
        await $fetch('/api/v1/auth/me')
    } catch {
        navigateTo('/login')
        return
    }

    await loadTokens()
})
</script>
