import prisma from '../../../utils/prisma'
import { requireApiToken } from '../../../utils/api-token'

export default defineEventHandler(async (event) => {
    // Verify API token
    const apiToken = await requireApiToken(event)

    // Check scope
    if (!apiToken.scopes.includes('albums:read')) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Missing required scope: albums:read'
        })
    }

    const albums = await prisma.album.findMany({
        where: { ownerId: apiToken.userId },
        include: {
            _count: {
                select: { photos: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return {
        success: true,
        data: albums.map((album: any) => ({
            id: album.id,
            title: album.title,
            description: album.description,
            photoCount: album._count.photos,
            eventDate: album.eventDate ? Number(album.eventDate) : null,
            createdAt: Number(album.createdAt),
            updatedAt: Number(album.updatedAt),
            isPublic: album.isPublic
        }))
    }
})
