import { isSetupComplete } from '../../../utils/setup'

/**
 * Check if initial setup has been completed
 */
export default defineEventHandler(async (event) => {
    try {
        const setupComplete = await isSetupComplete()

        return {
            success: true,
            data: {
                setupComplete,
            },
        }
    } catch (error: any) {
        console.error('Error checking setup status:', error)

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to check setup status',
        })
    }
})
