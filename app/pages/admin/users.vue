<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Admin Dashboard" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">User Management</h1>

                <!-- Search -->
                <div class="relative">
                    <input v-model="searchQuery" @input="handleSearch" type="text" placeholder="Search users…"
                        class="pl-9 pr-4 py-2 text-sm rounded-xl transition w-64"
                        style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    <svg xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <!-- Users Table -->
            <div class="rounded-2xl overflow-hidden"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--separator); background: var(--surface-2);">
                                <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">User</th>
                                <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Role</th>
                                <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Joined</th>
                                <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Stats</th>
                                <th class="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading" class="animate-pulse">
                                <td colspan="5" class="px-6 py-8 text-center text-sm" style="color: var(--text-3);">Loading users…</td>
                            </tr>
                            <tr v-else-if="users.length === 0">
                                <td colspan="5" class="px-6 py-8 text-center text-sm" style="color: var(--text-3);">No users found.</td>
                            </tr>
                            <tr v-for="u in users" :key="u.id" class="transition"
                                style="border-top: 1px solid var(--separator);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                                            style="background: var(--accent-light); color: var(--accent);">
                                            {{ u.name?.[0]?.toUpperCase() || '?' }}
                                        </div>
                                        <div>
                                            <div class="font-medium text-sm" style="color: var(--text-1);">{{ u.name || 'Unnamed' }}</div>
                                            <div class="text-xs" style="color: var(--text-3);">{{ u.email }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <select :value="u.role" @change="updateRole(u, $event)"
                                        :disabled="u.id === user?.id"
                                        class="px-2.5 py-1.5 text-xs rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </td>
                                <td class="px-6 py-4 text-sm" style="color: var(--text-2);">
                                    {{ formatDate(u.createdAt) }}
                                </td>
                                <td class="px-6 py-4 text-sm" style="color: var(--text-2);">
                                    <div>{{ u._count.ownedAlbums }} Albums</div>
                                    <div>{{ u._count.uploadedPhotos }} Photos</div>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button v-if="u.id !== user?.id" @click="impersonateUser(u)"
                                        class="p-1.5 rounded-lg transition mr-2" style="color: var(--text-2);"
                                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                        title="Login as this user">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </button>
                                    <button @click="openEditModal(u)"
                                        class="p-1.5 rounded-lg transition mr-2" style="color: var(--accent);"
                                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-light)'"
                                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                        title="Edit User">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button @click="deleteUser(u)" :disabled="u.id === user?.id"
                                        class="p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                                        style="color: var(--error);"
                                        @mouseover="u.id !== user?.id && (($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)')"
                                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                        title="Delete User">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
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

                <!-- Pagination -->
                <div v-if="pagination.totalPages > 1"
                    class="px-6 py-4 flex justify-between items-center"
                    style="border-top: 1px solid var(--separator);">
                    <button @click="changePage(pagination.page - 1)" :disabled="pagination.page === 1"
                        class="px-4 py-2 rounded-full text-sm transition disabled:opacity-50"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Previous
                    </button>
                    <span class="text-sm" style="color: var(--text-3);">Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
                    <button @click="changePage(pagination.page + 1)"
                        :disabled="pagination.page === pagination.totalPages"
                        class="px-4 py-2 rounded-full text-sm transition disabled:opacity-50"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Next
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit User Modal -->
        <div v-if="showEditModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showEditModal = false">
            <div class="rounded-2xl p-6 max-w-md w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-xl font-bold mb-4" style="color: var(--text-1);">Edit User</h3>

                <form @submit.prevent="handleEditSubmit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Name</label>
                        <input v-model="editForm.name" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Email</label>
                        <input v-model="editForm.email" type="email" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Instagram</label>
                        <input v-model="editForm.instagram" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Role</label>
                        <select v-model="editForm.role"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                    <div class="flex gap-3 pt-2">
                        <button type="button" @click="showEditModal = false"
                            class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                            Cancel
                        </button>
                        <button type="submit" :disabled="saving"
                            class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!saving && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ saving ? 'Saving…' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const dialog = useDialog()
import { debounce } from 'lodash-es'
import { getAuthToken, setAuthToken } from '~/utils/auth-client'

const IMPERSONATE_RETURN_KEY = 'pichaus_impersonate_return_token'

interface User {
    id: string
    name: string | null
    email: string | null
    instagram: string | null
    role: 'USER' | 'ADMIN'
    createdAt: number
    _count: {
        ownedAlbums: number
        uploadedPhotos: number
    }
}

const user = ref<any>(null)
const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')
const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
})

// Check auth and role
onMounted(async () => {
    try {
        const { data } = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = data

        if (user.value?.role !== 'ADMIN') {
            navigateTo('/album')
        } else {
            fetchUsers()
        }
    } catch (e) {
        navigateTo('/login')
    }
})

const fetchUsers = async () => {
    loading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: User[]; pagination: any }>('/api/v1/admin/users', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.limit,
                search: searchQuery.value
            }
        })

        if (res.success) {
            users.value = res.data
            pagination.value = res.pagination
        }
    } catch (err) {
        console.error('Failed to fetch users', err)
    } finally {
        loading.value = false
    }
}

const handleSearch = debounce(() => {
    pagination.value.page = 1
    fetchUsers()
}, 300)

const changePage = (page: number) => {
    pagination.value.page = page
    fetchUsers()
}

const updateRole = async (targetUser: User, event: Event) => {
    const newRole = (event.target as HTMLSelectElement).value
    if (!await dialog.confirm(`Change ${targetUser.name}'s role to ${newRole}?`)) {
        // Reset select value if cancelled (tricky with v-model, better to force update or reload)
        fetchUsers()
        return
    }

    try {
        await $fetch(`/api/v1/admin/users/${targetUser.id}`, {
            method: 'PATCH',
            body: { role: newRole }
        })
        targetUser.role = newRole as 'USER' | 'ADMIN'
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to update role')
        fetchUsers() // Revert UI
    }
}

const deleteUser = async (targetUser: User) => {
    if (!await dialog.confirm(`Are you sure you want to delete ${targetUser.name}? This will delete all their albums and photos.`, { danger: true })) return

    try {
        await $fetch(`/api/v1/admin/users/${targetUser.id}`, {
            method: 'DELETE'
        })
        fetchUsers()
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to delete user')
    }
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
}

// Edit User Modal
const showEditModal = ref(false)
const editingUser = ref<User | null>(null)
const editForm = ref({
    name: '',
    email: '',
    instagram: '',
    role: 'USER' as 'USER' | 'ADMIN'
})
const saving = ref(false)

const openEditModal = (targetUser: User) => {
    editingUser.value = targetUser
    editForm.value = {
        name: targetUser.name || '',
        email: targetUser.email || '',
        instagram: targetUser.instagram || '',
        role: targetUser.role
    }
    showEditModal.value = true
}

const handleEditSubmit = async () => {
    if (!editingUser.value) return
    saving.value = true

    try {
        await $fetch(`/api/v1/admin/users/${editingUser.value.id}`, {
            method: 'PATCH',
            body: editForm.value
        })
        showEditModal.value = false
        fetchUsers()
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to update user')
    } finally {
        saving.value = false
    }
}

const impersonateUser = async (targetUser: User) => {
    if (!await dialog.confirm(`Login as ${targetUser.name || targetUser.email || 'this user'}? Your admin session will be saved and you can restore it from the login page.`)) return

    try {
        const res = await $fetch<{ success: boolean; data: { accessToken: string; name: string } }>(
            `/api/v1/admin/users/${targetUser.id}/impersonate`, { method: 'POST' }
        )
        // Save current admin token so the user can return
        const currentToken = getAuthToken()
        if (currentToken) localStorage.setItem(IMPERSONATE_RETURN_KEY, currentToken)
        setAuthToken(res.data.accessToken)
        await navigateTo('/album')
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to impersonate user')
    }
}
</script>
