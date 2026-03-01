import prisma from '../../../../utils/prisma'
import { requireApiToken } from '../../../../utils/api-token'

export default defineEventHandler(async (event) => {
    const apiToken = await requireApiToken(event)
    const albumId = getRouterParam(event, 'id')

    if (!albumId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Album ID is required'
        })
    }

    if (!apiToken.scopes.includes('albums:read')) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Missing required scope: albums:read'
        })
    }

    const album = await prisma.album.findFirst({
        where: {
            id: albumId,
            ownerId: apiToken.userId,
        },
        include: {
            _count: {
                select: {
                    photos: true,
                    collaborators: true,
                }
            },
            coverPhoto: {
                select: {
                    id: true,
                    blurhash: true,
                }
            }
        }
    })

    if (!album) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Album not found'
        })
    }

    const baseUrl = getRequestURL(event).origin

    return {
        success: true,
        data: {
            id: album.id,
            title: album.title,
            description: album.description,
            tags: album.tags,
            isPublic: album.isPublic,
            eventDate: album.eventDate ? Number(album.eventDate) : null,
            createdAt: Number(album.createdAt),
            updatedAt: Number(album.updatedAt),
            photoCount: album._count.photos,
            collaboratorCount: album._count.collaborators,
            coverPhoto: album.coverPhoto
                ? {
                    id: album.coverPhoto.id,
                    blurhash: album.coverPhoto.blurhash,
                    thumbnailUrl: `${baseUrl}/api/assets/thumb/${album.coverPhoto.id}`,
                    fullUrl: `${baseUrl}/api/assets/full/${album.coverPhoto.id}`
                }
                : null,
            links: {
                photos: `${baseUrl}/api/external/albums/${album.id}/photos`,
                randomPhotos: `${baseUrl}/api/external/albums/${album.id}/random`
            }
        }
    }
})
