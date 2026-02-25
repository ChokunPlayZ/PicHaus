import { clearAuthCookie } from '../../../utils/auth'

/**
 * Logout endpoint - clears the auth session cookie
 */
export default defineEventHandler(async (event) => {
    try {
        // Clear the auth cookie
        clearAuthCookie(event)

        return {
            success: true,
            message: 'Logged out successfully',
        }
    } catch (error: any) {
        console.error('Error logging out:', error)

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to logout',
        })
    }
})
