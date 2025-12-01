<template>
    <div class="min-h-screen bg-gradient-to-br from-[#5e4d56] to-[#3e3c5f] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <!-- Logo/Header -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold text-white mb-2">📸 PicHaus</h1>
                <p class="text-purple-200">Welcome back</p>
            </div>

            <!-- Login Card -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                <h2 class="text-2xl font-bold text-white mb-6">Sign In</h2>

                <form @submit.prevent="handleLogin" class="space-y-4">
                    <!-- Email Field -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-purple-200 mb-2">
                            Email
                        </label>
                        <input id="email" v-model="form.email" type="email" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="your@email.com" />
                    </div>

                    <!-- Password Field -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-purple-200 mb-2">
                            Password
                        </label>
                        <input id="password" v-model="form.password" type="password" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Enter your password" />
                    </div>

                    <!-- Error Message -->
                    <div v-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ error }}</p>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" :disabled="loading"
                        class="w-full bg-gradient-to-r from-[#f7c7d5] to-[#9995ee] hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                        <span v-if="loading">Signing in...</span>
                        <span v-else>Sign In</span>
                    </button>
                </form>
            </div>

            <!-- Footer -->
            <p class="text-center text-purple-300 text-sm mt-6">
                Collaborative photo albums for photography clubs
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
const form = ref({
    email: '',
    password: '',
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
    loading.value = true
    error.value = ''

    try {
        const response = await $fetch<{ success: boolean }>('/api/v1/auth/login', {
            method: 'POST',
            body: form.value,
        })

        if (response.success) {
            // Redirect to albums page after successful login
            await navigateTo('/album')
        }
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Login failed. Please check your credentials.'
    } finally {
        loading.value = false
    }
}

// Check if setup is complete, redirect to setup if not
// Also check if user is already logged in
onMounted(async () => {
    try {
        // Check setup status first
        const status = await $fetch<{ data: { setupComplete: boolean } }>('/api/v1/setup/status')
        if (!status.data.setupComplete) {
            await navigateTo('/setup')
            return
        }

        // Check if already logged in
        try {
            await $fetch('/api/v1/auth/me')
            // If successful, user is logged in
            await navigateTo('/album')
        } catch (e) {
            // Not logged in, stay on login page
        }
    } catch (err) {
        console.error('Error checking status:', err)
    }
})
</script>
