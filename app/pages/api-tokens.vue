<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="API Tokens" :show-back="true" back-text="Back to Albums" back-to="/album" />

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Create New Token Section -->
            <div class="rounded-2xl p-6 mb-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <h2 class="text-xl font-bold mb-1" style="color: var(--text-1);">Create New API Token</h2>
                <p class="text-sm mb-5" style="color: var(--text-2);">
                    API tokens allow external services to access your photos and albums.
                </p>

                <form @submit.prevent="handleCreateToken" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Token Name</label>
                        <input v-model="newToken.name" type="text" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="e.g., My Website Integration"
                            @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2" style="color: var(--text-2);">Permissions</label>
                        <div class="flex flex-wrap gap-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="newToken.scopes" value="photos:read"
                                    class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                                <span class="text-sm" style="color: var(--text-1);">Read Photos</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="newToken.scopes" value="albums:read"
                                    class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                                <span class="text-sm" style="color: var(--text-1);">Read Albums</span>
                            </label>
                        </div>
                    </div>

                    <div v-if="createError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ createError }}
                    </div>

                    <button type="submit" :disabled="creating"
                        class="px-6 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!creating && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                        {{ creating ? 'Creating…' : 'Create Token' }}
                    </button>
                </form>
            </div>

            <!-- Newly Created Token Display -->
            <div v-if="createdToken" class="rounded-2xl p-6 mb-6"
                style="background: var(--success-bg); border: 1px solid var(--success-border);">
                <h3 class="text-base font-bold mb-1" style="color: var(--success-text);">Token Created!</h3>
                <p class="text-sm mb-4" style="color: var(--success-text); opacity: 0.8;">
                    Copy this token now. You won't be able to see it again!
                </p>
                <div class="flex items-center gap-2">
                    <code class="flex-1 px-4 py-3 rounded-xl font-mono text-sm break-all"
                        style="background: var(--surface-1); color: var(--text-1); border: 1px solid var(--separator);">
                        {{ createdToken }}
                    </code>
                    <button @click="copyToken"
                        class="px-4 py-2.5 rounded-full text-sm font-medium transition whitespace-nowrap"
                        :style="copied ? 'background: var(--success-text); color: white;' : 'background: var(--accent); color: var(--accent-text);'">
                        {{ copied ? '✓ Copied' : 'Copy' }}
                    </button>
                </div>
            </div>

            <!-- Existing Tokens List -->
            <div class="rounded-2xl p-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <h2 class="text-xl font-bold mb-4" style="color: var(--text-1);">Your API Tokens</h2>

                <div v-if="loading" class="text-sm animate-pulse" style="color: var(--text-3);">Loading tokens…</div>

                <div v-else-if="tokens.length === 0" class="text-sm" style="color: var(--text-3);">
                    You don't have any API tokens yet.
                </div>

                <div v-else class="space-y-3">
                    <div v-for="token in tokens" :key="token.id"
                        class="flex items-center justify-between p-4 rounded-xl"
                        style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <div>
                            <h4 class="font-medium text-sm" style="color: var(--text-1);">{{ token.name }}</h4>
                            <p class="text-xs font-mono mt-0.5" style="color: var(--text-3);">{{ token.prefix }}</p>
                            <div class="flex gap-1.5 mt-1.5">
                                <span v-for="scope in token.scopes" :key="scope"
                                    class="text-xs px-2 py-0.5 rounded-full"
                                    style="background: var(--accent-light); color: var(--accent);">
                                    {{ scope }}
                                </span>
                            </div>
                            <p class="text-xs mt-1.5" style="color: var(--text-3);">
                                Created: {{ formatDate(token.createdAt) }}
                                <span v-if="token.lastUsedAt"> · Last used: {{ formatDate(token.lastUsedAt) }}</span>
                            </p>
                        </div>
                        <button @click="revokeToken(token.id)"
                            class="px-3 py-1.5 rounded-full text-xs transition"
                            style="background: var(--error-bg); color: var(--error-text); border: 1px solid var(--error-border);">
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
