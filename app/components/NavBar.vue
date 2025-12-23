<template>
    <nav class="bg-white/10 backdrop-blur-lg border-b border-white/20 relative z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- Left Side: Back Button or Title -->
                <div class="flex items-center">
                    <button v-if="showBack" @click="handleBack"
                        class="flex items-center space-x-2 text-white hover:text-purple-300 transition mr-4">
                        <span>←</span>
                        <span>{{ backText || 'Back' }}</span>
                    </button>
                    <div v-if="title" class="flex items-center space-x-4">
                        <span class="text-purple-200 font-bold text-lg">{{ title }}</span>
                    </div>
                </div>

                <!-- Right Side: User Dropdown -->
                <div class="relative" ref="dropdownRef">
                    <button @click="toggleDropdown"
                        class="flex items-center space-x-2 text-white hover:text-purple-300 transition focus:outline-none">
                        <span class="font-medium">{{ user?.name || 'User' }}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform duration-200"
                            :class="{ 'rotate-180': showDropdown }" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <!-- Dropdown Menu -->
                    <transition enter-active-class="transition ease-out duration-100"
                        enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                        leave-active-class="transition ease-in duration-75"
                        leave-from-class="transform opacity-100 scale-100"
                        leave-to-class="transform opacity-0 scale-95">
                        <div v-if="showDropdown"
                            class="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-lg rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none border border-white/20">

                            <div class="px-4 py-2 border-b border-white/10">
                                <p class="text-sm text-white font-medium truncate">{{ user?.name }}</p>
                                <p class="text-xs text-white/60 truncate">{{ user?.email }}</p>
                            </div>

                            <a v-if="user?.role === 'ADMIN'" @click="navigateTo('/admin/users'); closeDropdown()"
                                class="px-4 py-2 text-sm text-white hover:bg-white/10 cursor-pointer flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Admin Dashboard
                            </a>

                            <a @click="navigateTo('/settings'); closeDropdown()"
                                class="px-4 py-2 text-sm text-white hover:bg-white/10 cursor-pointer flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                            </a>

                            <a @click="navigateTo('/api-tokens'); closeDropdown()"
                                class="px-4 py-2 text-sm text-white hover:bg-white/10 cursor-pointer flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                API Tokens
                            </a>

                            <div class="border-t border-white/10 my-1"></div>

                            <a @click="handleLogout"
                                class="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </a>
                        </div>
                    </transition>
                </div>
            </div>
        </div>
    </nav>
</template>

<script setup lang="ts">
const props = defineProps<{
    title?: string
    showBack?: boolean
    backText?: string
    backTo?: string
}>()

const user = ref<any>(null)
const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onMounted(async () => {
    try {
        const { data } = await useFetch('/api/v1/auth/me')
        user.value = data.value?.data
    } catch (e) {
        console.error('Failed to fetch user', e)
    }

    window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside)
})

const toggleDropdown = () => {
    showDropdown.value = !showDropdown.value
}

const closeDropdown = () => {
    showDropdown.value = false
}

const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
        closeDropdown()
    }
}

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
        window.location.href = '/login'
    } catch (err) {
        console.error('Logout failed', err)
    }
}
</script>
