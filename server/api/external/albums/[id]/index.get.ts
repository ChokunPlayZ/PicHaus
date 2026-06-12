import { eq, and, sql } from 'drizzle-orm'
import { albums } from '../../../../db/schema'
import { requireApiToken } from '../../../../utils/api-token'

export default defineEventHandler(async (event) => {
    const apiToken = await requireApiToken(event)
    const albumId = getRouterParam(event, 'id')

    if (!albumId) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })
    if (!apiToken.scopes.includes('albums:read')) throw createError({ statusCode: 403, statusMessage: 'Missing required scope: albums:read' })

    const [album] = await db.select({
        id: albums.id,
        title: albums.title,
        description: albums.description,
        tags: albums.tags,
        isPublic: albums.isPublic,
        eventDate: albums.eventDate,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        ownerId: albums.ownerId,
        coverPhotoId: albums.coverPhotoId,
        photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."albumId" = "albums"."id")`,
        collaboratorCount: sql<number>`(SELECT COUNT(*) FROM album_collaborators WHERE album_collaborators."albumId" = "albums"."id")`,
        coverBlurhash: sql<string | null>`(SELECT blurhash FROM photos WHERE id = "albums"."coverPhotoId"::uuid)`,
    })
        .from(albums)
        .where(and(eq(albums.id, albumId), eq(albums.ownerId, apiToken.userId)))

    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

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
            photoCount: Number(album.photoCount),
            collaboratorCount: Number(album.collaboratorCount),
            coverPhoto: album.coverPhotoId
                ? { id: album.coverPhotoId, blurhash: album.coverBlurhash, thumbnailUrl: `${baseUrl}/api/assets/thumb/${album.coverPhotoId}`, fullUrl: `${baseUrl}/api/assets/full/${album.coverPhotoId}` }
                : null,
            links: { photos: `${baseUrl}/api/external/albums/${album.id}/photos`, randomPhotos: `${baseUrl}/api/external/albums/${album.id}/random` },
        },
    }
})
