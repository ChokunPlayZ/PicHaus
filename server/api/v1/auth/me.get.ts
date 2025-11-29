import prisma from '../../../utils/prisma'

/**
 * Get current authenticated user
 */
export default defineEventHandler(async (event) => {
    try {
        const authToken = getCookie(event, 'auth-token')

        if (!authToken) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Not authenticated',
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: authToken },
            select: {
                id: true,
                email: true,
                name: true,
                instagram: true,
                createdAt: true,
            },
        })

        if (!user) {
            // Clear invalid cookie
            deleteCookie(event, 'auth-token')

            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid session',
            })
        }

        return {
            success: true,
            data: {
                ...user,
                createdAt: Number(user.createdAt),
            },
        }
    } catch (error: any) {
        console.error('Error fetching user:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch user',
        })
    }
})
