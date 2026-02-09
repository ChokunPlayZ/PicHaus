import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID is required',
        })
    }

    // Find the link first to check ownership
    const link = await prisma.shareLink.findUnique({
        where: { id },
        include: {
            album: {
                select: { ownerId: true }
            },
            shareGroup: {
                select: { ownerId: true }
            }
        }
    })

    if (!link) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Link not found',
        })
    }

    // Check ownership
    // The link belongs to an album OR a share group owned by the user
    const albumOwnerId = link.album?.ownerId
    const groupOwnerId = link.shareGroup?.ownerId
    const isOwner = (albumOwnerId === user.id) || (groupOwnerId === user.id)

    if (!isOwner && user.role !== 'ADMIN') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Unauthorized',
        })
    }

    await prisma.shareLink.delete({
        where: { id }
    })

    return {
        success: true,
        message: 'Link deleted'
    }
})
