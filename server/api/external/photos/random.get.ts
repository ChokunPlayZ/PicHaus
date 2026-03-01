import prisma from '../../../utils/prisma'
import { requireApiToken } from '../../../utils/api-token'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseUnix = (value: unknown): bigint | null => {
    if (typeof value !== 'string' || value.trim() === '') return null
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return BigInt(Math.trunc(n))
}

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
    const albumIdInput = typeof query.albumId === 'string' ? query.albumId : null
    const albumId = albumIdInput && UUID_REGEX.test(albumIdInput) ? albumIdInput : null
    const tag = typeof query.tag === 'string' ? query.tag.trim() : ''
    const orientation = typeof query.orientation === 'string' ? query.orientation : 'any'
    const visibility = typeof query.visibility === 'string' ? query.visibility : 'public'
    const fromDateTaken = parseUnix(typeof query.fromDateTaken === 'string' ? query.fromDateTaken : '')
    const toDateTaken = parseUnix(typeof query.toDateTaken === 'string' ? query.toDateTaken : '')

    // Get random photos from user's albums
    // Prisma doesn't support random ordering natively well, so we might use raw query or fetch IDs then fetch items
    // PostgreSQL has RANDOM()

        const photos = await prisma.$queryRaw`
        SELECT p.id, p."filename", p."originalName", p."width", p."height", p."blurhash", p."dateTaken", p."createdAt", a.id as "albumId", a.title as "albumTitle"
        FROM photos p
        JOIN albums a ON p."albumId" = a.id
                WHERE a."ownerId" = ${apiToken.userId}::uuid
                    AND (${visibility} = 'all' OR (${visibility} = 'public' AND a."isPublic" = true) OR (${visibility} = 'private' AND a."isPublic" = false))
                    AND (${albumId}::uuid IS NULL OR a.id = ${albumId}::uuid)
                    AND (${tag} = '' OR ${tag} = ANY(a.tags))
                    AND (
                        ${orientation} = 'any'
                        OR (${orientation} = 'landscape' AND p.width > p.height)
                        OR (${orientation} = 'portrait' AND p.height > p.width)
                        OR (${orientation} = 'square' AND p.width = p.height)
                    )
                      AND (${fromDateTaken}::bigint IS NULL OR p."dateTaken" >= ${fromDateTaken}::bigint)
                      AND (${toDateTaken}::bigint IS NULL OR p."dateTaken" <= ${toDateTaken}::bigint)
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
        })),
        meta: {
            filters: {
                count,
                albumId,
                tag: tag || null,
                orientation,
                visibility,
                fromDateTaken: fromDateTaken ? Number(fromDateTaken) : null,
                toDateTaken: toDateTaken ? Number(toDateTaken) : null,
            }
        }
    }
})
