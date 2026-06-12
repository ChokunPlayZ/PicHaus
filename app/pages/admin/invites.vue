<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Invites & Resets" />

        <div class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">

            <div class="flex flex-wrap items-center justify-between gap-3">
                <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">Invites &amp; Password Resets</h1>
                <div class="flex gap-2">
                    <button @click="openCreate('invite')"
                        class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Invite
                    </button>
                    <button @click="openCreate('password_reset')"
                        class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a4 4 0 11-2.83 6.83L8 18H5v-3l4.17-4.17A4 4 0 0115 7z" />
                        </svg>
                        Reset Password
                    </button>
                </div>
            </div>

            <!-- Token list -->
            <div class="rounded-2xl overflow-hidden"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div v-if="listLoading" class="p-8 text-center text-sm animate-pulse" style="color: var(--text-3);">Loading…</div>
                <div v-else-if="tokens.length === 0" class="p-10 text-center text-sm" style="color: var(--text-3);">
                    No active tokens. Create an invite or password reset link above.
                </div>
                <ul v-else>
                    <li v-for="t in tokens" :key="t.id"
                        class="flex flex-wrap items-center gap-3 px-6 py-4"
                        style="border-top: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                        <!-- Type badge -->
                        <span class="shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full"
                            :style="t.type === 'invite' ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--warning-bg); color: var(--warning-text);'">
                            {{ t.type === 'invite' ? 'Invite' : 'Password Reset' }}
                        </span>

                        <!-- Label / target -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate" style="color: var(--text-1);">
                                {{ t.type === 'password_reset' ? (t.targetEmail ?? '—') : (t.label ?? 'No label') }}
                            </p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">
                                Expires {{ formatDate(t.expiresAt) }}
                                <span v-if="t.expired" class="ml-1" style="color: var(--error);">(expired)</span>
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-2 shrink-0">
                            <button @click="copyLink(t.token)"
                                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition"
                                :style="copiedId === t.id ? 'background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border);' : 'background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {{ copiedId === t.id ? 'Copied!' : 'Copy Link' }}
                            </button>
                            <button @click="revoke(t.id)"
                                class="px-3 py-1.5 rounded-full text-xs font-medium transition"
                                style="background: var(--error-bg); color: var(--error-text); border: 1px solid var(--error-border);">
                                Revoke
                            </button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Create modal -->
        <div v-if="modal.open"
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="modal.open = false">
            <div class="w-full max-w-md rounded-2xl p-6 space-y-4"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h2 class="text-xl font-bold" style="color: var(--text-1);">
                    {{ modal.type === 'invite' ? 'Create Invite Link' : 'Generate Password Reset Link' }}
                </h2>

                <!-- Invite: optional label -->
                <div v-if="modal.type === 'invite'">
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Label (optional)</label>
                    <input v-model="modal.label" type="text"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="e.g. Photography club 2026 intake"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <!-- Password reset: user picker -->
                <div v-if="modal.type === 'password_reset'">
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">User</label>
                    <input v-model="userSearch" type="text" placeholder="Search by name or email…"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition mb-2"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    <div class="max-h-48 overflow-y-auto space-y-1 rounded-xl p-1"
                        style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <button v-for="u in filteredUsers" :key="u.id" type="button"
                            @click="modal.userId = u.id; modal.targetLabel = u.email ?? u.name ?? u.id"
                            class="w-full text-left px-3 py-2 rounded-lg text-sm transition"
                            :style="modal.userId === u.id ? 'background: var(--accent-light); color: var(--accent);' : 'color: var(--text-1);'"
                            @mouseover="modal.userId !== u.id && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                            @mouseout="modal.userId !== u.id && (($event.currentTarget as HTMLElement).style.background = 'transparent')">
                            <span class="font-medium">{{ u.name ?? '—' }}</span>
                            <span class="ml-2 text-xs" style="color: var(--text-3);">{{ u.email }}</span>
                        </button>
                        <p v-if="filteredUsers.length === 0" class="text-xs px-3 py-2" style="color: var(--text-3);">No users match.</p>
                    </div>
                    <p v-if="modal.userId" class="mt-2 text-xs" style="color: var(--success-text);">Selected: {{ modal.targetLabel }}</p>
                </div>

                <!-- Expiry -->
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Expires in</label>
                    <select v-model="modal.expiresInHours"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                        <option value="24">24 hours</option>
                        <option value="72">3 days</option>
                        <option value="168">7 days (default)</option>
                        <option value="720">30 days</option>
                    </select>
                </div>

                <div v-if="modal.error" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ modal.error }}
                </div>

                <div class="flex gap-2 pt-1">
                    <button @click="createToken" :disabled="modal.creating"
                        class="flex-1 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!modal.creating && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ modal.creating ? 'Generating…' : 'Generate Link' }}
                    </button>
                    <button @click="modal.open = false"
                        class="px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
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
