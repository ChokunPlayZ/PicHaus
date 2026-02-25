import prisma from '../../../../utils/prisma'
import { requireApiToken } from '../../../../utils/api-token'

export default defineEventHandler(async (event) => {
    // Verify API token
    const apiToken = await requireApiToken(event)
    const albumId = getRouterParam(event, 'id')

    if (!albumId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Album ID is required'
        })
    }

    // Check scope
    if (!apiToken.scopes.includes('photos:read')) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Missing required scope: photos:read'
        })
    }

    // Verify album ownership/access
    const album = await prisma.album.findUnique({
        where: { id: albumId }
    })

    if (!album) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Album not found'
        })
    }

    if (album.ownerId !== apiToken.userId) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Permission denied'
        })
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit

    const photos = await prisma.photo.findMany({
        where: { albumId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
    })

    const baseUrl = getRequestURL(event).origin

    return {
        success: true,
        data: photos.map((photo: any) => ({
            id: photo.id,
            url: `${baseUrl}/api/assets/full/${photo.id}`,
            thumbnailUrl: `${baseUrl}/api/assets/thumb/${photo.id}`,
            filename: photo.filename,
            originalName: photo.originalName,
            width: photo.width,
            height: photo.height,
            blurhash: photo.blurhash,
            dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
            createdAt: Number(photo.createdAt)
        })),
        pagination: {
            page,
            limit,
            hasMore: photos.length === limit
        }
    }
})
