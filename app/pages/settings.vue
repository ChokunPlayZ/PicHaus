<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f]">
        <!-- Navigation Bar -->
        <NavBar title="Settings" :show-back="true" back-text="Back to Albums" back-to="/album" />

        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8">
                <h2 class="text-2xl font-bold text-white mb-6">Profile Settings</h2>

                <form @submit.prevent="handleSave" class="space-y-6">
                    <!-- Name -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Name</label>
                        <input v-model="form.name" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>

                    <!-- Email -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Email</label>
                        <input v-model="form.email" type="email" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>

                    <!-- Instagram -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Instagram (Optional)</label>
                        <div class="relative">
                            <span class="absolute left-4 top-3.5 text-white/40">@</span>
                            <input v-model="form.instagram" type="text"
                                class="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="username" />
                        </div>
                    </div>

                    <div class="border-t border-white/10 pt-6 mt-6">
                        <h3 class="text-xl font-bold text-white mb-4">Change Password</h3>
                        <p class="text-white/60 text-sm mb-4">Leave blank if you don't want to change it.</p>

                        <!-- New Password -->
                        <div>
                            <label class="block text-sm font-medium text-purple-200 mb-2">New Password</label>
                            <input v-model="form.password" type="password" minlength="6"
                                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="••••••••" />
                        </div>
                    </div>

                    <!-- Error/Success Messages -->
                    <div v-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ error }}</p>
                    </div>
                    <div v-if="success" class="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                        <p class="text-green-200 text-sm">{{ success }}</p>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end pt-4">
                        <button type="submit" :disabled="saving"
                            class="px-6 py-3 bg-gradient-to-r from-[#f7c7d5] to-[#9995ee] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ saving ? 'Saving...' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const form = ref({
    name: '',
    email: '',
    instagram: '',
    password: ''
})

const saving = ref(false)
const error = ref('')
const success = ref('')

// Load user data
onMounted(async () => {
    try {
        const { data } = await useFetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        if (data.value?.data) {
            const user = data.value.data
            form.value.name = user.name || ''
            form.value.email = user.email || ''
            form.value.instagram = user.instagram || ''
        } else {
            navigateTo('/login')
        }
    } catch (e) {
        navigateTo('/login')
    }
})

const handleSave = async () => {
    saving.value = true
    error.value = ''
    success.value = ''

    try {
        const body: any = {
            name: form.value.name,
            email: form.value.email,
            instagram: form.value.instagram
        }

        if (form.value.password) {
            body.password = form.value.password
        }

        await $fetch('/api/v1/users/me', {
            method: 'PATCH',
            body
        })

        success.value = 'Profile updated successfully'
        form.value.password = '' // Clear password field
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to update profile'
    } finally {
        saving.value = false
    }
}
</script>
