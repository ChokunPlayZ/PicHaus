import { isSetupComplete } from '../utils/setup'

export default defineEventHandler(async (event) => {
    const url = getRequestURL(event)

    // Only handle root path
    if (url.pathname !== '/') {
        return
    }

    try {
        // Check if setup is complete
        const setupComplete = await isSetupComplete()

        if (!setupComplete) {
            // No users exist, redirect to setup
            return sendRedirect(event, '/setup', 302)
        }

        // With localStorage bearer auth, token is client-side only.
        // Always route to login and let client redirect to /album when token is valid.
        return sendRedirect(event, '/login', 302)
    } catch (error) {
        console.error('Error in redirect middleware:', error)
        // Default to login on error
        return sendRedirect(event, '/login', 302)
    }
})
