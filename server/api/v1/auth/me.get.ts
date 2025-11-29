import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

/**
 * Get current authenticated user
 */
export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        return {
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                instagram: user.instagram,
                role: user.role,
                createdAt: Number(user.createdAt),
            },
        }
    } catch (error: any) {
        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch user',
        })
    }
})
