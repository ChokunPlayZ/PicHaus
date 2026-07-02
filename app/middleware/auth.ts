import { getAuthToken } from '~/utils/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
    if (!process.client) return
    if (!getAuthToken()) {
        return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }

    const currentUser = useState<any>('currentUser')
    if (!currentUser.value) {
        try {
            const res = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
            currentUser.value = res.data
        } catch {
            return navigateTo('/login')
        }
    }

    const user = currentUser.value
    if (user) {
        const isGuest = !user.email || !user.hasPassword
        if (isGuest && to.path !== '/onboarding') {
            return navigateTo(`/onboarding?redirect=${encodeURIComponent(to.fullPath)}`)
        }
    }
})
