import prisma from '../../../../utils/prisma'
import { requireApiToken } from '../../../../utils/api-token'

const parseUnix = (value: unknown): bigint | null => {
    if (typeof value !== 'string' || value.trim() === '') return null
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return BigInt(Math.trunc(n))
}

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
    const count = Math.min(Math.max(Number(query.count) || 1, 1), 50)
        const orientation = typeof query.orientation === 'string' ? query.orientation : 'any'
    const fromDateTaken = parseUnix(typeof query.fromDateTaken === 'string' ? query.fromDateTaken : '')
    const toDateTaken = parseUnix(typeof query.toDateTaken === 'string' ? query.toDateTaken : '')

    const photos = await prisma.$queryRaw`
        SELECT p.id, p."filename", p."originalName", p."width", p."height", p."blurhash", p."dateTaken", p."createdAt"
        FROM photos p
        WHERE p."albumId" = ${albumId}::uuid
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
        meta: {
            filters: {
                count,
                orientation,
                fromDateTaken: fromDateTaken ? Number(fromDateTaken) : null,
                toDateTaken: toDateTaken ? Number(toDateTaken) : null,
            }
        }
    }
})
