import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const albumId = getRouterParam(event, 'id')

    const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { ownerId: true }
    })

    if (!album) {
        throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    }

    if (album.ownerId !== user.id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const links = await prisma.shareLink.findMany({
        where: { albumId },
        orderBy: { createdAt: 'desc' }
    })

    return {
        success: true,
        data: links.map(link => ({
            ...link,
            createdAt: Number(link.createdAt),
            expiresAt: link.expiresAt ? Number(link.expiresAt) : null
        }))
    }
})
