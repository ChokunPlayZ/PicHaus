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
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit
    const orientation = typeof query.orientation === 'string' ? query.orientation : 'any'
    const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt'
    const order = typeof query.order === 'string' ? query.order : 'desc'
    const fromDateTaken = parseUnix(typeof query.fromDateTaken === 'string' ? query.fromDateTaken : '')
    const toDateTaken = parseUnix(typeof query.toDateTaken === 'string' ? query.toDateTaken : '')

    const where: any = { albumId }

    if (fromDateTaken || toDateTaken) {
        where.dateTaken = {}
        if (fromDateTaken) where.dateTaken.gte = fromDateTaken
        if (toDateTaken) where.dateTaken.lte = toDateTaken
    }

    const orderBy: any = (() => {
        const dir = order === 'asc' ? 'asc' : 'desc'
        if (sortBy === 'dateTaken') return { dateTaken: dir }
        if (sortBy === 'originalName') return { originalName: dir }
        return { createdAt: dir }
    })()

    const [total, photos] = await Promise.all([
        prisma.photo.count({ where }),
        prisma.photo.findMany({
            where,
            orderBy,
            skip,
            take: orientation === 'any' ? limit : limit * 3
        })
    ])

    const filteredPhotos = orientation === 'any'
        ? photos
        : photos.filter((photo: any) => {
            if (!photo.width || !photo.height) return false
            if (orientation === 'landscape') return photo.width > photo.height
            if (orientation === 'portrait') return photo.height > photo.width
            if (orientation === 'square') return photo.width === photo.height
            return true
        }).slice(0, limit)

    const baseUrl = getRequestURL(event).origin

    return {
        success: true,
        data: filteredPhotos.map((photo: any) => ({
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
            total,
            hasMore: orientation === 'any' ? skip + photos.length < total : filteredPhotos.length === limit
        },
        meta: {
            filters: {
                orientation,
                sortBy,
                order: order === 'asc' ? 'asc' : 'desc',
                fromDateTaken: fromDateTaken ? Number(fromDateTaken) : null,
                toDateTaken: toDateTaken ? Number(toDateTaken) : null,
            }
        }
    }
})
