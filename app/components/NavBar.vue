<template>
    <nav :class="[
        'relative z-50 transition-colors duration-300',
        solid ? 'bg-[var(--bg-primary-start)] border-b border-white/10 shadow-lg' : 'bg-white/10 backdrop-blur-lg border-b border-white/20'
    ]">
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

                <!-- Right Side: Inline Navigation -->
                <div class="flex items-center space-x-6">
                    <button @click="navigateTo('/album')"
                        class="text-white/80 hover:text-white transition cursor-pointer text-sm font-medium">
                        Albums
                    </button>
                    <button @click="navigateTo('/photos')"
                        class="text-white/80 hover:text-white transition cursor-pointer text-sm font-medium">
                        Photos
                    </button>
                    <button @click="navigateTo('/statistics')"
                        class="text-white/80 hover:text-white transition cursor-pointer text-sm font-medium">
                        Statistics
                    </button>

                    <template v-if="user?.role === 'ADMIN'">
                        <button @click="navigateTo('/admin/users')"
                            class="text-white/80 hover:text-white transition cursor-pointer text-sm font-medium">
                            Admin
                        </button>
                    </template>

                    <div class="h-4 w-px bg-white/20"></div>

                    <button @click="navigateTo('/settings')"
                        class="text-white/80 hover:text-white transition cursor-pointer text-sm font-medium flex items-center gap-2">
                        <img v-if="user?.avatar" :src="user.avatar" class="w-6 h-6 rounded-full bg-white/10" />
                        <span>{{ user?.name || 'Settings' }}</span>
                    </button>

                    <button @click="handleLogout"
                        class="text-red-300 hover:text-red-200 transition text-sm font-medium bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20">
                        Logout
                    </button>
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
    solid?: boolean
}>()

const user = ref<any>(null)
onMounted(async () => {
    try {
        const { data } = await useFetch('/api/v1/auth/me')
        user.value = data.value?.data
    } catch (e) {
        console.error('Failed to fetch user', e)
    }
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
        window.location.href = '/login'
    } catch (err) {
        console.error('Logout failed', err)
    }
}
</script>
