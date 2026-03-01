<template>
    <div>
        <aside
            class="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] border-r border-white/20 z-50 flex-col">
            <div class="p-4 border-b border-white/10">
                <div class="text-purple-200 font-bold text-lg leading-tight flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
                    </svg>
                    <span>PicHaus</span>
                </div>
            </div>

            <div class="p-3 space-y-1 flex-1 overflow-y-auto">
                <button v-for="item in navItems" :key="item.path" @click="navigateTo(item.path)"
                    :class="sidebarButtonClass(item.path)">
                    <span class="inline-flex items-center gap-2">
                        <svg v-if="item.icon === 'albums'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 7h5l2 2h11v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        <svg v-else-if="item.icon === 'photos'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.5-1.5a2 2 0 012.8 0L20 14m-12 6h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <svg v-else-if="item.icon === 'statistics'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 3v18h18M8 15V9m4 6V6m4 9v-4" />
                        </svg>
                        <svg v-else-if="item.icon === 'share-links'" xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 6m4 5a5 5 0 00-7.07 0L5.52 12.4a5 5 0 107.07 7.07L14 18" />
                        </svg>
                        <svg v-else-if="item.icon === 'docs'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm3 4h4m-4 4h4m-4 4h4" />
                        </svg>
                        <svg v-else-if="item.icon === 'api-keys'" xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15 7a4 4 0 11-2.8 6.8L7 19H4v-3l5.2-5.2A4 4 0 0115 7z" />
                        </svg>
                        <span>{{ item.label }}</span>
                    </span>
                </button>

                <template v-if="user?.role === 'ADMIN'">
                    <button @click="navigateTo('/admin/users')" :class="sidebarButtonClass('/admin/users')">
                        <span class="inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" />
                            </svg>
                            <span>Admin</span>
                        </span>
                    </button>
                </template>
            </div>

            <div class="p-3 border-t border-white/10 space-y-2">
                <button @click="navigateTo('/settings')" :class="sidebarButtonClass('/settings') + ' flex items-center gap-2'">
                    <img v-if="userAvatarUrl" :src="userAvatarUrl" class="w-6 h-6 rounded-full bg-white/10 object-cover" />
                    <div v-else
                        class="w-6 h-6 rounded-full bg-white/15 border border-white/20 text-white text-[10px] font-semibold flex items-center justify-center uppercase">
                        {{ userInitials }}
                    </div>
                    <span>{{ user?.name || 'Settings' }}</span>
                </button>

                <button @click="handleLogout"
                    class="w-full text-left text-red-300 hover:text-red-200 transition text-sm font-medium bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/20 whitespace-nowrap">
                    Logout
                </button>
            </div>
        </aside>

        <div
            class="lg:hidden sticky top-0 z-50 bg-gradient-to-r from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] border-b border-white/20 px-4 h-14 flex items-center justify-between">
            <span class="text-purple-200 font-bold text-base truncate inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
                </svg>
                <span>PicHaus</span>
            </span>

            <button @click="mobileOpen = true"
                class="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/90 text-sm">Menu</button>
        </div>

        <div v-if="mobileOpen" class="lg:hidden fixed inset-0 z-[60] bg-black/40" @click.self="mobileOpen = false">
            <aside class="w-72 h-full bg-gradient-to-b from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] border-r border-white/20 p-4 flex flex-col">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <div class="text-purple-200 font-bold text-lg inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
                            </svg>
                            <span>PicHaus</span>
                        </div>
                        <div v-if="displayTitle" class="text-white/60 text-sm">{{ displayTitle }}</div>
                    </div>
                    <button @click="mobileOpen = false" class="text-white/80 hover:text-white">✕</button>
                </div>

                <div class="space-y-1 flex-1 overflow-y-auto">
                    <button v-for="item in navItems" :key="`m-${item.path}`" @click="goMobile(item.path)"
                        :class="sidebarButtonClass(item.path)">
                        <span class="inline-flex items-center gap-2">
                            <svg v-if="item.icon === 'albums'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 7h5l2 2h11v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            </svg>
                            <svg v-else-if="item.icon === 'photos'" xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.5-1.5a2 2 0 012.8 0L20 14m-12 6h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <svg v-else-if="item.icon === 'statistics'" xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 3v18h18M8 15V9m4 6V6m4 9v-4" />
                            </svg>
                            <svg v-else-if="item.icon === 'share-links'" xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 6m4 5a5 5 0 00-7.07 0L5.52 12.4a5 5 0 107.07 7.07L14 18" />
                            </svg>
                            <svg v-else-if="item.icon === 'docs'" xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm3 4h4m-4 4h4m-4 4h4" />
                            </svg>
                            <svg v-else-if="item.icon === 'api-keys'" xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 7a4 4 0 11-2.8 6.8L7 19H4v-3l5.2-5.2A4 4 0 0115 7z" />
                            </svg>
                            <span>{{ item.label }}</span>
                        </span>
                    </button>

                    <template v-if="user?.role === 'ADMIN'">
                        <button @click="goMobile('/admin/users')" :class="sidebarButtonClass('/admin/users')">
                            <span class="inline-flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" />
                                </svg>
                                <span>Admin</span>
                            </span>
                        </button>
                    </template>
                </div>

                <div class="border-t border-white/10 pt-3 space-y-2">
                    <button @click="goMobile('/settings')" :class="sidebarButtonClass('/settings') + ' flex items-center gap-2'">
                        <img v-if="userAvatarUrl" :src="userAvatarUrl" class="w-6 h-6 rounded-full bg-white/10 object-cover" />
                        <div v-else
                            class="w-6 h-6 rounded-full bg-white/15 border border-white/20 text-white text-[10px] font-semibold flex items-center justify-center uppercase">
                            {{ userInitials }}
                        </div>
                        <span>{{ user?.name || 'Settings' }}</span>
                    </button>
                    <button @click="handleLogout"
                        class="w-full text-left text-red-300 hover:text-red-200 transition text-sm font-medium bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/20">
                        Logout
                    </button>
                </div>
            </aside>
        </div>
    </div>
</template>

<script setup lang="ts">
import { clearAuthToken } from '~/utils/auth-client'

const route = useRoute()
const mobileOpen = ref(false)

const props = defineProps<{
    title?: string
    showBack?: boolean
    backText?: string
    backTo?: string
    solid?: boolean
}>()

const displayTitle = computed(() => {
    const value = (props.title || '').trim()
    if (!value) return ''
    const normalized = value.replace(/[^a-zA-Z]/g, '').toLowerCase()
    if (normalized === 'pichaus') return ''
    return value
})

const navItems = [
    { label: 'Albums', path: '/album', icon: 'albums' },
    { label: 'Photos', path: '/photos', icon: 'photos' },
    { label: 'Statistics', path: '/statistics', icon: 'statistics' },
    { label: 'Share Links', path: '/share-links', icon: 'share-links' },
    { label: 'Docs', path: '/docs', icon: 'docs' },
    { label: 'API Keys', path: '/api-tokens', icon: 'api-keys' },
]

const navButtonClass = (path: string) => {
    const isActive = route.path === path || (path !== '/album' && route.path.startsWith(`${path}/`))
    return [
        'cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg border transition whitespace-nowrap',
        isActive
            ? 'text-white bg-white/15 border-white/20'
            : 'text-white/80 hover:text-white bg-transparent border-transparent hover:bg-white/10 hover:border-white/10'
    ].join(' ')
}

const sidebarButtonClass = (path: string) => navButtonClass(path) + ' w-full text-left'

const goMobile = async (path: string) => {
    mobileOpen.value = false
    await navigateTo(path)
}

const user = useState<any>('navbar-user', () => null)

const userAvatarUrl = computed(() => {
    const avatar = user.value?.avatar
    return typeof avatar === 'string' && avatar.trim().length > 0 ? avatar : ''
})

const userInitials = computed(() => {
    const name = (user.value?.name || '').trim()
    if (name) {
        const parts = name.split(/\s+/).filter(Boolean)
        if (parts.length === 1) return parts[0]?.slice(0, 2) || 'U'
        return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}` || 'U'
    }

    const email = (user.value?.email || '').trim()
    if (email) return email.slice(0, 2)
    return 'U'
})
onMounted(async () => {
    const win = window as Window & { __picHausSidebarNavCount?: number }
    win.__picHausSidebarNavCount = (win.__picHausSidebarNavCount || 0) + 1
    document.body.classList.add('has-sidebar-nav')

    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        if (response?.data) {
            user.value = response.data
        }
    } catch (e) {
        console.error('Failed to fetch user', e)
    }
})

onUnmounted(() => {
    const win = window as Window & { __picHausSidebarNavCount?: number }
    win.__picHausSidebarNavCount = Math.max((win.__picHausSidebarNavCount || 1) - 1, 0)

    if (win.__picHausSidebarNavCount === 0) {
        document.body.classList.remove('has-sidebar-nav')
    }
})

watch(() => route.path, () => {
    mobileOpen.value = false
})

const handleBack = () => {
    if (props.backTo) {
        navigateTo(props.backTo)
    } else {
        navigateTo('/album')
    }
}

const handleLogout = async () => {
    try {
        await $fetch('/api/v1/auth/logout', { method: 'POST' })
        clearAuthToken()
        window.location.href = '/login'
    } catch (err) {
        console.error('Logout failed', err)
    }
}
</script>

<style scoped>
:global(body.has-sidebar-nav) {
    padding-left: 16rem;
}

@media (max-width: 1023px) {
    :global(body.has-sidebar-nav) {
        padding-left: 0;
    }
}
</style>
