import prisma from '../../../utils/prisma'
import { requireApiToken } from '../../../utils/api-token'

export default defineEventHandler(async (event) => {
    // Verify API token
    const apiToken = await requireApiToken(event)

    // Check scope
    if (!apiToken.scopes.includes('photos:read')) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Missing required scope: photos:read'
        })
    }

    // Get query params
    const query = getQuery(event)
    const count = Math.min(Math.max(Number(query.count) || 1, 1), 50) // clamp between 1 and 50

    // Get random photos from user's albums
    // Prisma doesn't support random ordering natively well, so we might use raw query or fetch IDs then fetch items
    // PostgreSQL has RANDOM()

    const photos = await prisma.$queryRaw`
        SELECT p.id, p."filename", p."originalName", p."width", p."height", p."blurhash", p."dateTaken", p."createdAt", a.id as "albumId", a.title as "albumTitle"
        FROM photos p
        JOIN albums a ON p."albumId" = a.id
        WHERE a."ownerId" = ${apiToken.userId}::uuid AND a."isPublic" = true
        ORDER BY RANDOM()
        LIMIT ${count}
    ` as any[]

    // Construct full URLs (assuming server is hosting or serving static)
    // We need to know the base URL. For now we returns paths or relative URLs.
    // Assets are served via /api/assets/full/:id and /api/assets/thumb/:id

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
            createdAt: Number(photo.createdAt),
            album: {
                id: photo.albumId,
                title: photo.albumTitle
            }
        }))
    }
})
