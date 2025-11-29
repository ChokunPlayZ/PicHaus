<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Navigation Bar -->
        <!-- Navigation Bar -->
        <NavBar :show-back="true" back-text="Back to Albums" back-to="/album" title="Admin Dashboard" />

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-white">User Management</h1>

                <!-- Search -->
                <div class="relative">
                    <input v-model="searchQuery" @input="handleSearch" type="text" placeholder="Search users..."
                        class="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-64" />
                    <svg xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <!-- Users Table -->
            <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b border-white/10 bg-white/5">
                                <th class="px-6 py-4 text-sm font-semibold text-purple-200">User</th>
                                <th class="px-6 py-4 text-sm font-semibold text-purple-200">Role</th>
                                <th class="px-6 py-4 text-sm font-semibold text-purple-200">Joined</th>
                                <th class="px-6 py-4 text-sm font-semibold text-purple-200">Stats</th>
                                <th class="px-6 py-4 text-sm font-semibold text-purple-200 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            <tr v-if="loading" class="animate-pulse">
                                <td colspan="5" class="px-6 py-8 text-center text-white/60">Loading users...</td>
                            </tr>
                            <tr v-else-if="users.length === 0">
                                <td colspan="5" class="px-6 py-8 text-center text-white/60">No users found.</td>
                            </tr>
                            <tr v-for="u in users" :key="u.id" class="hover:bg-white/5 transition">
                                <td class="px-6 py-4">
                                    <div class="flex items-center">
                                        <div
                                            class="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg mr-3">
                                            {{ u.name?.[0]?.toUpperCase() || '?' }}
                                        </div>
                                        <div>
                                            <div class="font-medium text-white">{{ u.name || 'Unnamed' }}</div>
                                            <div class="text-sm text-white/60">{{ u.email }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <select :value="u.role" @change="updateRole(u, $event)"
                                        :disabled="u.id === user?.id"
                                        class="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </td>
                                <td class="px-6 py-4 text-sm text-white/80">
                                    {{ formatDate(u.createdAt) }}
                                </td>
                                <td class="px-6 py-4 text-sm text-white/80">
                                    <div>{{ u._count.ownedAlbums }} Albums</div>
                                    <div>{{ u._count.uploadedPhotos }} Photos</div>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button @click="deleteUser(u)" :disabled="u.id === user?.id"
                                        class="text-red-400 hover:text-red-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Delete User">
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

                <!-- Pagination -->
                <div v-if="pagination.totalPages > 1"
                    class="px-6 py-4 border-t border-white/10 flex justify-between items-center">
                    <button @click="changePage(pagination.page - 1)" :disabled="pagination.page === 1"
                        class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition disabled:opacity-50">
                        Previous
                    </button>
                    <span class="text-white/60">Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
                    <button @click="changePage(pagination.page + 1)"
                        :disabled="pagination.page === pagination.totalPages"
                        class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition disabled:opacity-50">
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash-es'

interface User {
    id: string
    name: string | null
    email: string | null
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
        console.log('Current user:', user.value)

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
        const { data } = await useFetch<{ success: boolean; data: User[]; pagination: any }>('/api/v1/admin/users', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.limit,
                search: searchQuery.value
            }
        })

        if (data.value?.success) {
            users.value = data.value.data
            pagination.value = data.value.pagination
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
    if (!confirm(`Change ${targetUser.name}'s role to ${newRole}?`)) {
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
        alert(err.data?.statusMessage || 'Failed to update role')
        fetchUsers() // Revert UI
    }
}

const deleteUser = async (targetUser: User) => {
    if (!confirm(`Are you sure you want to delete ${targetUser.name}? This will delete all their albums and photos.`)) return

    try {
        await $fetch(`/api/v1/admin/users/${targetUser.id}`, {
            method: 'DELETE'
        })
        fetchUsers()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete user')
    }
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
}
</script>
