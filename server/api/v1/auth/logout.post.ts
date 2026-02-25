/**
 * Logout endpoint (stateless for bearer auth)
 */
export default defineEventHandler(async (event) => {
    try {
        // Stateless for bearer token auth (client drops token locally)

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
