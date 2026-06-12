<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="w-full max-w-sm">
            <!-- Logo / Header -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style="background: var(--accent-light);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--accent);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                </div>
                <h1 class="text-2xl font-bold tracking-tight" style="color: var(--text-1);">PicHaus</h1>
                <p class="mt-1 text-sm" style="color: var(--text-2);">Initial Setup</p>
            </div>

            <!-- Setup Card -->
            <div class="rounded-2xl p-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-md);">
                <h2 class="text-base font-semibold mb-5" style="color: var(--text-1);">Create Admin Account</h2>

                <form @submit.prevent="handleSetup" class="space-y-4">
                    <!-- Name -->
                    <div>
                        <label for="name" class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">
                            Name
                        </label>
                        <input id="name" v-model="form.name" type="text" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Your name"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">
                            Email
                        </label>
                        <input id="email" v-model="form.email" type="email" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="admin@example.com"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">
                            Password
                        </label>
                        <input id="password" v-model="form.password" type="password" required minlength="8"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="At least 8 characters"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.2)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        <p class="text-xs mt-1" style="color: var(--text-3);">Minimum 8 characters</p>
                    </div>

                    <!-- Error -->
                    <div v-if="error" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ error }}
                    </div>

                    <!-- Submit -->
                    <button type="submit" :disabled="loading"
                        class="w-full py-2.5 text-sm font-medium rounded-full transition"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!loading && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <span v-if="loading" class="flex items-center justify-center gap-2">
                            <span class="w-4 h-4 rounded-full border-2 animate-spin"
                                style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></span>
                            Setting up…
                        </span>
                        <span v-else>Complete Setup</span>
                    </button>
                </form>
            </div>

            <p class="text-center text-xs mt-4" style="color: var(--text-3);">
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
            await navigateTo('/login')
        }
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Setup failed. Please try again.'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    try {
        const status = await $fetch<{ data: { setupComplete: boolean } }>('/api/v1/setup/status')
        if (status.data.setupComplete) {
            await navigateTo('/login')
        }
    } catch (err) {
        console.error('Error checking setup status:', err)
    }
})
</script>
