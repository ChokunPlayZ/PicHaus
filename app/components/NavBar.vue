<template>
    <div>
        <!-- Desktop sidebar -->
        <aside
            class="hidden lg:flex fixed inset-y-0 left-0 w-64 z-50 flex-col"
            style="background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);">
            <div class="p-4" style="border-bottom: 1px solid var(--separator);">
                <div class="font-semibold text-base leading-tight flex items-center gap-2" style="color: var(--text-1);">
                    <img v-if="effectiveLogoImageUrl" :src="effectiveLogoImageUrl" alt="Logo"
                        class="h-8 max-w-[140px] object-contain" />
                    <template v-else>
                        <Icon name="lucide:camera" class="w-5 h-5 shrink-0" style="color: var(--accent);" :stroke-width="2" />
                        <span>{{ effectiveLogoText }}</span>
                    </template>
                </div>
            </div>

            <div class="p-2 space-y-0.5 flex-1 overflow-y-auto">
                <!-- Search Button -->
                <button @click="isOpen = true"
                    class="w-full text-left cursor-pointer text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center justify-between mb-2 group"
                    style="color: var(--text-2); background: var(--surface-2); border: 1px solid var(--separator);">
                    <span class="inline-flex items-center gap-2.5">
                        <Icon name="lucide:search" class="w-4 h-4 shrink-0 transition-colors group-hover:text-[var(--text-1)]" :stroke-width="2" />
                        <span class="group-hover:text-[var(--text-1)] transition-colors">Search...</span>
                    </span>
                    <kbd class="px-1.5 py-0.5 text-[9px] font-semibold border rounded transition-colors group-hover:border-[var(--text-3)]"
                        style="background-color: var(--surface-3); border-color: var(--separator); color: var(--text-3);">
                        ⌘K
                    </kbd>
                </button>

                <button v-for="item in navItems" :key="item.path" @click="navigateTo(item.path)"
                    :class="sidebarButtonClass(item.path)" :style="sidebarButtonStyle(item.path)">
                    <span class="inline-flex items-center gap-2.5">
                        <Icon :name="getIconName(item.icon)" class="w-4 h-4" :stroke-width="2" />
                        <span>{{ item.label }}</span>
                    </span>
                </button>

                <template v-if="user?.role === 'ADMIN'">
                    <div class="pt-2 pb-1 px-3" style="font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em;">Admin</div>
                    <button @click="navigateTo('/admin/users')" :class="sidebarButtonClass('/admin/users')" :style="sidebarButtonStyle('/admin/users')">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon name="lucide:users" class="w-4 h-4" :stroke-width="2" />
                            <span>Users</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/status')" :class="sidebarButtonClass('/admin/status')" :style="sidebarButtonStyle('/admin/status')">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon name="lucide:activity" class="w-4 h-4" :stroke-width="2" />
                            <span>Server Status</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/invites')" :class="sidebarButtonClass('/admin/invites')" :style="sidebarButtonStyle('/admin/invites')">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon name="lucide:mail" class="w-4 h-4" :stroke-width="2" />
                            <span>Invites</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/logos')" :class="sidebarButtonClass('/admin/logos')" :style="sidebarButtonStyle('/admin/logos')">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon name="lucide:image" class="w-4 h-4" :stroke-width="2" />
                            <span>Logos</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/settings')" :class="sidebarButtonClass('/admin/settings')" :style="sidebarButtonStyle('/admin/settings')">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon name="lucide:settings" class="w-4 h-4" :stroke-width="2" />
                            <span>Site Settings</span>
                        </span>
                    </button>
                </template>
            </div>

            <div class="p-2 space-y-1" style="border-top: 1px solid var(--separator);">
                <!-- Theme Toggle -->
                <button @click="toggleTheme"
                    class="w-full text-left text-sm font-medium px-3 py-2 rounded-lg transition flex items-center justify-between"
                    style="color: var(--text-2); background: transparent;"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; ($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'; ($event.currentTarget as HTMLElement).style.color = 'var(--text-2)'">
                    <span class="inline-flex items-center gap-2.5">
                        <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="w-4 h-4" :stroke-width="2" />
                        <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
                    </span>
                </button>

                <button @click="navigateTo('/settings')" :class="sidebarButtonClass('/settings') + ' flex items-center gap-2.5'" :style="sidebarButtonStyle('/settings')">
                    <img v-if="userAvatarUrl" :src="userAvatarUrl" class="w-6 h-6 rounded-full object-cover flex-shrink-0" style="border: 1px solid var(--separator);" />
                    <div v-else
                        class="w-6 h-6 rounded-full flex items-center justify-center uppercase text-[10px] font-semibold flex-shrink-0"
                        style="background: var(--accent-light); color: var(--accent);">
                        {{ userInitials }}
                    </div>
                    <span class="truncate">{{ user?.name || 'Settings' }}</span>
                </button>

                <button @click="handleLogout"
                    class="w-full text-left text-sm font-medium px-3 py-2 rounded-lg transition"
                    style="color: var(--error); background: var(--error-bg);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-border)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'">
                    Sign Out
                </button>
            </div>
        </aside>

        <!-- Mobile top bar -->
        <div
            class="lg:hidden sticky top-0 z-50 h-14 flex items-center justify-between px-4"
            style="background: var(--sidebar-bg); border-bottom: 1px solid var(--sidebar-border); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);">
            <span class="font-semibold text-base truncate inline-flex items-center gap-2" style="color: var(--text-1);">
                <img v-if="effectiveLogoImageUrl" :src="effectiveLogoImageUrl" alt="Logo"
                    class="h-7 max-w-[120px] object-contain" />
                <template v-else>
                    <Icon name="lucide:camera" class="w-5 h-5 shrink-0" style="color: var(--accent);" :stroke-width="2" />
                    <span>{{ effectiveLogoText }}</span>
                </template>
            </span>

            <button @click="mobileOpen = true"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
                style="background: var(--surface-3); color: var(--text-1); border: 1px solid var(--separator);">
                Menu
            </button>
        </div>

        <!-- Mobile drawer -->
        <div v-if="mobileOpen" class="lg:hidden fixed inset-0 z-[60]" style="background: rgba(0,0,0,0.35); backdrop-filter: blur(4px);" @click.self="mobileOpen = false">
            <aside class="w-72 h-full flex flex-col p-2"
                style="background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);">
                <div class="flex items-center justify-between mb-2 px-2 pt-2 pb-3" style="border-bottom: 1px solid var(--separator);">
                    <div class="font-semibold text-base inline-flex items-center gap-2" style="color: var(--text-1);">
                        <img v-if="effectiveLogoImageUrl" :src="effectiveLogoImageUrl" alt="Logo"
                            class="h-8 max-w-[140px] object-contain" />
                        <template v-else>
                            <Icon name="lucide:camera" class="w-5 h-5 shrink-0" style="color: var(--accent);" :stroke-width="2" />
                            <span>{{ effectiveLogoText }}</span>
                        </template>
                    </div>
                    <button @click="mobileOpen = false"
                        class="w-7 h-7 rounded-full flex items-center justify-center text-sm transition"
                        style="background: var(--surface-3); color: var(--text-2);">✕</button>
                </div>

                <div class="space-y-0.5 flex-1 overflow-y-auto">
                    <!-- Mobile Search Button -->
                    <button @click="goMobileSearch"
                        class="w-full text-left cursor-pointer text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center justify-between mb-2"
                        style="color: var(--text-2); background: var(--surface-2); border: 1px solid var(--separator);">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon name="lucide:search" class="w-4 h-4 shrink-0" :stroke-width="2" />
                            <span>Search...</span>
                        </span>
                    </button>

                    <button v-for="item in navItems" :key="`m-${item.path}`" @click="goMobile(item.path)"
                        :class="sidebarButtonClass(item.path)" :style="sidebarButtonStyle(item.path)">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon :name="getIconName(item.icon)" class="w-4 h-4" :stroke-width="2" />
                            <span>{{ item.label }}</span>
                        </span>
                    </button>

                    <template v-if="user?.role === 'ADMIN'">
                        <div class="pt-2 pb-1 px-3" style="font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em;">Admin</div>
                        <button @click="goMobile('/admin/users')" :class="sidebarButtonClass('/admin/users')" :style="sidebarButtonStyle('/admin/users')">
                            <span class="inline-flex items-center gap-2.5">
                                <Icon name="lucide:users" class="w-4 h-4" :stroke-width="2" />
                                <span>Users</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/status')" :class="sidebarButtonClass('/admin/status')" :style="sidebarButtonStyle('/admin/status')">
                            <span class="inline-flex items-center gap-2.5">
                                <Icon name="lucide:activity" class="w-4 h-4" :stroke-width="2" />
                                <span>Server Status</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/invites')" :class="sidebarButtonClass('/admin/invites')" :style="sidebarButtonStyle('/admin/invites')">
                            <span class="inline-flex items-center gap-2.5">
                                <Icon name="lucide:mail" class="w-4 h-4" :stroke-width="2" />
                                <span>Invites</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/logos')" :class="sidebarButtonClass('/admin/logos')" :style="sidebarButtonStyle('/admin/logos')">
                            <span class="inline-flex items-center gap-2.5">
                                <Icon name="lucide:image" class="w-4 h-4" :stroke-width="2" />
                                <span>Logos</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/settings')" :class="sidebarButtonClass('/admin/settings')" :style="sidebarButtonStyle('/admin/settings')">
                            <span class="inline-flex items-center gap-2.5">
                                <Icon name="lucide:settings" class="w-4 h-4" :stroke-width="2" />
                                <span>Site Settings</span>
                            </span>
                        </button>
                    </template>
                </div>

                <div class="pt-2 space-y-1" style="border-top: 1px solid var(--separator);">
                    <!-- Theme Toggle -->
                    <button @click="toggleTheme"
                        class="w-full text-left text-sm font-medium px-3 py-2 rounded-lg transition flex items-center justify-between"
                        style="color: var(--text-2); background: transparent;"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; ($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'; ($event.currentTarget as HTMLElement).style.color = 'var(--text-2)'">
                        <span class="inline-flex items-center gap-2.5">
                            <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="w-4 h-4" :stroke-width="2" />
                            <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
                        </span>
                    </button>

                    <button @click="goMobile('/settings')" :class="sidebarButtonClass('/settings') + ' flex items-center gap-2.5'" :style="sidebarButtonStyle('/settings')">
                        <img v-if="userAvatarUrl" :src="userAvatarUrl" class="w-6 h-6 rounded-full object-cover flex-shrink-0" style="border: 1px solid var(--separator);" />
                        <div v-else
                            class="w-6 h-6 rounded-full flex items-center justify-center uppercase text-[10px] font-semibold flex-shrink-0"
                            style="background: var(--accent-light); color: var(--accent);">
                            {{ userInitials }}
                        </div>
                        <span class="truncate">{{ user?.name || 'Settings' }}</span>
                    </button>
                    <button @click="handleLogout"
                        class="w-full text-left text-sm font-medium px-3 py-2 rounded-lg transition"
                        style="color: var(--error); background: var(--error-bg);">
                        Sign Out
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
const isOpen = useState<boolean>('command-palette-open', () => false)

const props = defineProps<{
    title?: string
    showBack?: boolean
    backText?: string
    backTo?: string
    solid?: boolean
    logoText?: string
    logoImageUrl?: string
}>()

const { settings } = useSiteSettings()

const effectiveLogoImageUrl = computed(() => props.logoImageUrl ?? settings.value.logoImageUrl ?? '')
const effectiveLogoText = computed(() => props.logoText || settings.value.siteName || 'PicHaus')

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

const sidebarButtonClass = (path: string) => {
    const isActive = route.path === path || (path !== '/album' && route.path.startsWith(`${path}/`))
    const base = 'w-full text-left cursor-pointer text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap'
    return isActive
        ? `${base} font-medium`
        : `${base}`
}

const sidebarButtonStyle = (path: string) => {
    const isActive = route.path === path || (path !== '/album' && route.path.startsWith(`${path}/`))
    return isActive
        ? `background: var(--accent); color: var(--accent-text);`
        : `color: var(--text-2); background: transparent;`
}

const goMobile = async (path: string) => {
    mobileOpen.value = false
    await navigateTo(path)
}

const goMobileSearch = () => {
    mobileOpen.value = false
    isOpen.value = true
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

const getIconName = (icon: string) => {
  const map: Record<string, string> = {
    'albums': 'lucide:folder',
    'photos': 'lucide:image',
    'statistics': 'lucide:bar-chart-3',
    'share-links': 'lucide:link',
    'docs': 'lucide:file-text',
    'api-keys': 'lucide:key'
  }
  return map[icon] || 'lucide:chevron-right'
}

const isDark = ref(false)

onMounted(async () => {
    const win = window as Window & { __picHausSidebarNavCount?: number }
    win.__picHausSidebarNavCount = (win.__picHausSidebarNavCount || 0) + 1
    document.body.classList.add('has-sidebar-nav')

    // Detect initial theme class
    isDark.value = document.documentElement.classList.contains('dark')

    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        if (response?.data) {
            user.value = response.data
            // Sync theme preference across machines
            if (response.data.themePreference) {
                const isPrefDark = response.data.themePreference === 'dark'
                isDark.value = isPrefDark
                if (isPrefDark) {
                    document.documentElement.classList.add('dark')
                    localStorage.setItem('theme', 'dark')
                    document.cookie = 'theme=dark; path=/; max-age=31536000; SameSite=Lax'
                } else {
                    document.documentElement.classList.remove('dark')
                    localStorage.setItem('theme', 'light')
                    document.cookie = 'theme=light; path=/; max-age=31536000; SameSite=Lax'
                }
            }
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

const toggleTheme = async () => {
    const nextDark = !isDark.value
    isDark.value = nextDark
    const themeStr = nextDark ? 'dark' : 'light'

    if (nextDark) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }

    localStorage.setItem('theme', themeStr)
    document.cookie = `theme=${themeStr}; path=/; max-age=31536000; SameSite=Lax`

    if (user.value) {
        try {
            await $fetch('/api/v1/users/me', {
                method: 'PATCH',
                body: { themePreference: themeStr }
            })
        } catch (e) {
            console.error('Failed to save theme preference', e)
        }
    }
}
</script>

<style scoped>
/* Apply active/inactive button styles dynamically since Tailwind can't do CSS var-based arbitrary values inline in :class */
button.sidebar-active {
    background: var(--accent);
    color: var(--accent-text);
}
button.sidebar-inactive {
    color: var(--text-2);
    background: transparent;
}
button.sidebar-inactive:hover {
    background: var(--surface-3);
    color: var(--text-1);
}

:global(body.has-sidebar-nav) {
    padding-left: 16rem;
}

@media (max-width: 1023px) {
    :global(body.has-sidebar-nav) {
        padding-left: 0;
    }
}
</style>
