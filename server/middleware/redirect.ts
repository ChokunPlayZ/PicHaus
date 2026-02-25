import { isSetupComplete } from '../utils/setup'
import { getAuthUserId } from '../utils/auth'

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

        // Setup complete, check if user is logged in
        const authUserId = getAuthUserId(event)

        if (authUserId) {
            // User is logged in, redirect to albums
            return sendRedirect(event, '/album', 302)
        } else {
            // Not logged in, redirect to login
            return sendRedirect(event, '/login', 302)
        }
    } catch (error) {
        console.error('Error in redirect middleware:', error)
        // Default to login on error
        return sendRedirect(event, '/login', 302)
    }
})
