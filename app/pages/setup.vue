<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <!-- Logo/Header -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold text-white mb-2">📸 PicHaus</h1>
                <p class="text-purple-200">Initial Setup</p>
            </div>

            <!-- Setup Card -->
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                <h2 class="text-2xl font-bold text-white mb-6">Create Admin Account</h2>

                <form @submit.prevent="handleSetup" class="space-y-4">
                    <!-- Name Field -->
                    <div>
                        <label for="name" class="block text-sm font-medium text-purple-200 mb-2">
                            Name
                        </label>
                        <input id="name" v-model="form.name" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="Your name" />
                    </div>

                    <!-- Email Field -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-purple-200 mb-2">
                            Email
                        </label>
                        <input id="email" v-model="form.email" type="email" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="admin@example.com" />
                    </div>

                    <!-- Password Field -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-purple-200 mb-2">
                            Password
                        </label>
                        <input id="password" v-model="form.password" type="password" required minlength="8"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="At least 8 characters" />
                        <p class="text-xs text-purple-300 mt-1">Minimum 8 characters</p>
                    </div>

                    <!-- Error Message -->
                    <div v-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ error }}</p>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" :disabled="loading"
                        class="w-full bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                        <span v-if="loading">Setting up...</span>
                        <span v-else>Complete Setup</span>
                    </button>
                </form>
            </div>

            <!-- Footer -->
            <p class="text-center text-purple-300 text-sm mt-6">
                This will create the first admin account for PicHaus
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
const form = ref({
    name: '',
    email: '',
    password: '',
})

const loading = ref(false)
const error = ref('')

const handleSetup = async () => {
    loading.value = true
    error.value = ''

    try {
        const response = await $fetch<{ success: boolean }>('/api/v1/setup', {
            method: 'POST',
            body: form.value,
        })

        if (response.success) {
            // Redirect to login after successful setup
            await navigateTo('/login')
        }
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Setup failed. Please try again.'
    } finally {
        loading.value = false
    }
}

// Check if setup is already complete
onMounted(async () => {
    try {
        const status = await $fetch<{ data: { setupComplete: boolean } }>('/api/v1/setup/status')
        if (status.data.setupComplete) {
            // Redirect to login if setup is already done
            await navigateTo('/login')
        }
    } catch (err) {
        console.error('Error checking setup status:', err)
    }
})
</script>
