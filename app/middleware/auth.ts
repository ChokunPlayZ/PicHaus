import { getAuthToken } from '~/utils/auth-client'

export default defineNuxtRouteMiddleware((to) => {
    if (!process.client) return
    if (!getAuthToken()) {
        return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
})
