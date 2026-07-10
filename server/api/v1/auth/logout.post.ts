/**
 * Logout endpoint (stateless for bearer auth)
 */
export default defineEventHandler(() => {
    // Stateless for bearer token auth (client drops token locally)
    return {
        success: true,
        message: 'Logged out successfully',
    }
})
