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
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" style="color: var(--accent);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
                        </svg>
                        <span>{{ effectiveLogoText }}</span>
                    </template>
                </div>
            </div>

            <div class="p-2 space-y-0.5 flex-1 overflow-y-auto">
                <button v-for="item in navItems" :key="item.path" @click="navigateTo(item.path)"
                    :class="sidebarButtonClass(item.path)" :style="sidebarButtonStyle(item.path)">
                    <span class="inline-flex items-center gap-2.5">
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
                    <div class="pt-2 pb-1 px-3" style="font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em;">Admin</div>
                    <button @click="navigateTo('/admin/users')" :class="sidebarButtonClass('/admin/users')" :style="sidebarButtonStyle('/admin/users')">
                        <span class="inline-flex items-center gap-2.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                            </svg>
                            <span>Users</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/status')" :class="sidebarButtonClass('/admin/status')" :style="sidebarButtonStyle('/admin/status')">
                        <span class="inline-flex items-center gap-2.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Server Status</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/invites')" :class="sidebarButtonClass('/admin/invites')" :style="sidebarButtonStyle('/admin/invites')">
                        <span class="inline-flex items-center gap-2.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Invites</span>
                        </span>
                    </button>
                    <button @click="navigateTo('/admin/settings')" :class="sidebarButtonClass('/admin/settings')" :style="sidebarButtonStyle('/admin/settings')">
                        <span class="inline-flex items-center gap-2.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Site Settings</span>
                        </span>
                    </button>
                </template>
            </div>

            <div class="p-2 space-y-1" style="border-top: 1px solid var(--separator);">
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
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--accent);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
                    </svg>
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
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: var(--accent);">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
                            </svg>
                            <span>{{ effectiveLogoText }}</span>
                        </template>
                    </div>
                    <button @click="mobileOpen = false"
                        class="w-7 h-7 rounded-full flex items-center justify-center text-sm transition"
                        style="background: var(--surface-3); color: var(--text-2);">✕</button>
                </div>

                <div class="space-y-0.5 flex-1 overflow-y-auto">
                    <button v-for="item in navItems" :key="`m-${item.path}`" @click="goMobile(item.path)"
                        :class="sidebarButtonClass(item.path)" :style="sidebarButtonStyle(item.path)">
                        <span class="inline-flex items-center gap-2.5">
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
                        <div class="pt-2 pb-1 px-3" style="font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em;">Admin</div>
                        <button @click="goMobile('/admin/users')" :class="sidebarButtonClass('/admin/users')" :style="sidebarButtonStyle('/admin/users')">
                            <span class="inline-flex items-center gap-2.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                </svg>
                                <span>Users</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/status')" :class="sidebarButtonClass('/admin/status')" :style="sidebarButtonStyle('/admin/status')">
                            <span class="inline-flex items-center gap-2.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Server Status</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/invites')" :class="sidebarButtonClass('/admin/invites')" :style="sidebarButtonStyle('/admin/invites')">
                            <span class="inline-flex items-center gap-2.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Invites</span>
                            </span>
                        </button>
                        <button @click="goMobile('/admin/settings')" :class="sidebarButtonClass('/admin/settings')" :style="sidebarButtonStyle('/admin/settings')">
                            <span class="inline-flex items-center gap-2.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Site Settings</span>
                            </span>
                        </button>
                    </template>
                </div>

                <div class="pt-2 space-y-1" style="border-top: 1px solid var(--separator);">
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
