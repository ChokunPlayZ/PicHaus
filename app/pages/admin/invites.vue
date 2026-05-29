<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Invites & Resets" />

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <div class="flex flex-wrap items-center justify-between gap-3">
                <h1 class="text-3xl font-bold text-white">Invites &amp; Password Resets</h1>
                <div class="flex gap-2">
                    <button @click="openCreate('invite')"
                        class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white text-sm font-semibold rounded-lg transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Invite
                    </button>
                    <button @click="openCreate('password_reset')"
                        class="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-lg transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                        </svg>
                        Reset Password
                    </button>
                </div>
            </div>

            <!-- Token list -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                <div v-if="listLoading" class="p-8 text-center text-[var(--text-muted)] animate-pulse text-sm">Loading…</div>
                <div v-else-if="tokens.length === 0" class="p-10 text-center text-[var(--text-muted)] text-sm border-dashed">
                    No active tokens. Create an invite or password reset link above.
                </div>
                <ul v-else class="divide-y divide-white/10">
                    <li v-for="t in tokens" :key="t.id" class="flex flex-wrap items-center gap-3 px-6 py-4">
                        <!-- Type badge -->
                        <span class="shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full"
                            :class="t.type === 'invite' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'">
                            {{ t.type === 'invite' ? 'Invite' : 'Password Reset' }}
                        </span>

                        <!-- Label / target -->
                        <div class="flex-1 min-w-0">
                            <p class="text-white text-sm font-medium truncate">
                                {{ t.type === 'password_reset' ? (t.targetEmail ?? '—') : (t.label ?? 'No label') }}
                            </p>
                            <p class="text-xs text-[var(--text-muted)]">
                                Expires {{ formatDate(t.expiresAt) }}
                                <span v-if="t.expired" class="text-red-400 ml-1">(expired)</span>
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-2 shrink-0">
                            <button @click="copyLink(t.token)"
                                class="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xs font-medium rounded-lg transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {{ copiedId === t.id ? 'Copied!' : 'Copy Link' }}
                            </button>
                            <button @click="revoke(t.id)"
                                class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-300 text-xs font-medium rounded-lg transition">
                                Revoke
                            </button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Create modal -->
        <div v-if="modal.open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="modal.open = false">
            <div class="w-full max-w-md bg-gradient-to-b from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] rounded-2xl border border-white/20 p-6 space-y-4">
                <h2 class="text-xl font-bold text-white">
                    {{ modal.type === 'invite' ? 'Create Invite Link' : 'Generate Password Reset Link' }}
                </h2>

                <!-- Invite: optional label -->
                <div v-if="modal.type === 'invite'">
                    <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Label (optional)</label>
                    <input v-model="modal.label" type="text"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        placeholder="e.g. Photography club 2026 intake" />
                </div>

                <!-- Password reset: user picker -->
                <div v-if="modal.type === 'password_reset'">
                    <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">User</label>
                    <div class="relative mb-2">
                        <input v-model="userSearch" type="text" placeholder="Search by name or email…"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                    </div>
                    <div class="max-h-48 overflow-y-auto space-y-1">
                        <button v-for="u in filteredUsers" :key="u.id" type="button"
                            @click="modal.userId = u.id; modal.targetLabel = u.email ?? u.name ?? u.id"
                            class="w-full text-left px-3 py-2 rounded-lg text-sm transition"
                            :class="modal.userId === u.id ? 'bg-purple-500/30 text-white border border-purple-400/40' : 'bg-white/5 text-white/80 hover:bg-white/10 border border-transparent'">
                            <span class="font-medium">{{ u.name ?? '—' }}</span>
                            <span class="text-[var(--text-muted)] ml-2">{{ u.email }}</span>
                        </button>
                        <p v-if="filteredUsers.length === 0" class="text-[var(--text-muted)] text-xs px-3 py-2">No users match.</p>
                    </div>
                    <p v-if="modal.userId" class="mt-2 text-xs text-green-300">Selected: {{ modal.targetLabel }}</p>
                </div>

                <!-- Expiry -->
                <div>
                    <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Expires in</label>
                    <select v-model="modal.expiresInHours"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                        <option value="24">24 hours</option>
                        <option value="72">3 days</option>
                        <option value="168">7 days (default)</option>
                        <option value="720">30 days</option>
                    </select>
                </div>

                <div v-if="modal.error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p class="text-red-200 text-sm">{{ modal.error }}</p>
                </div>

                <div class="flex gap-2 pt-1">
                    <button @click="createToken" :disabled="modal.creating"
                        class="flex-1 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-[var(--btn-primary-hover-start)] hover:to-[var(--btn-primary-hover-end)] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                        {{ modal.creating ? 'Generating…' : 'Generate Link' }}
                    </button>
                    <button @click="modal.open = false"
                        class="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Token {
    id: string
    token: string
    type: string
    label: string | null
    targetEmail: string | null
    targetName: string | null
    expiresAt: number
    createdAt: number
    expired: boolean
}

interface UserRow { id: string; name: string | null; email: string | null }

const tokens = ref<Token[]>([])
const listLoading = ref(true)
const copiedId = ref<string | null>(null)
const allUsers = ref<UserRow[]>([])
const userSearch = ref('')

const modal = reactive({
    open: false,
    type: 'invite' as 'invite' | 'password_reset',
    label: '',
    userId: '',
    targetLabel: '',
    expiresInHours: '168',
    creating: false,
    error: null as string | null,
})

const filteredUsers = computed(() =>
    allUsers.value.filter(u => {
        const q = userSearch.value.toLowerCase()
        return !q || (u.name?.toLowerCase().includes(q)) || (u.email?.toLowerCase().includes(q))
    })
)

async function loadTokens() {
    listLoading.value = true
    try {
        const res = await $fetch<{ data: Token[] }>('/api/v1/admin/invites')
        tokens.value = res.data
    } finally {
        listLoading.value = false
    }
}

async function loadUsers() {
    try {
        const res = await $fetch<{ data: UserRow[] }>('/api/v1/admin/users?limit=500')
        allUsers.value = res.data
    } catch {}
}

function openCreate(type: 'invite' | 'password_reset') {
    modal.open = true
    modal.type = type
    modal.label = ''
    modal.userId = ''
    modal.targetLabel = ''
    modal.expiresInHours = type === 'password_reset' ? '24' : '168'
    modal.error = null
    userSearch.value = ''
}

async function createToken() {
    modal.error = null
    if (modal.type === 'password_reset' && !modal.userId) {
        modal.error = 'Please select a user'
        return
    }
    modal.creating = true
    try {
        const res = await $fetch<{ data: { token: string } }>('/api/v1/admin/invites', {
            method: 'POST',
            body: {
                type: modal.type,
                userId: modal.type === 'password_reset' ? modal.userId : undefined,
                label: modal.label || undefined,
                expiresInHours: Number(modal.expiresInHours),
            },
        })
        modal.open = false
        await loadTokens()
        // Auto-copy the new link
        copyLink(res.data.token)
    } catch (err: any) {
        modal.error = err?.data?.statusMessage ?? 'Failed to create token'
    } finally {
        modal.creating = false
    }
}

function getInviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`
}

async function copyLink(token: string) {
    const url = getInviteUrl(token)
    await navigator.clipboard.writeText(url)
    const t = tokens.value.find(t => t.token === token)
    if (t) {
        copiedId.value = t.id
        setTimeout(() => { copiedId.value = null }, 2000)
    }
}

async function revoke(id: string) {
    if (!confirm('Revoke this link? It will no longer be usable.')) return
    await $fetch(`/api/v1/admin/invites/${id}`, { method: 'DELETE' })
    await loadTokens()
}

function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

onMounted(() => {
    loadTokens()
    loadUsers()
})
</script>
