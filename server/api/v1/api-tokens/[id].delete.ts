import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    // Require authentication
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Token ID is required',
        })
    }

    // Verify ownership
    const token = await prisma.apiToken.findUnique({
        where: { id },
    })

    if (!token) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Token not found',
        })
    }

    if (token.userId !== user.id) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Permission denied',
        })
    }

    // Delete token
    await prisma.apiToken.delete({
        where: { id },
    })

    return {
        success: true,
        message: 'Token revoked successfully',
    }
})
