import prisma from '../../../utils/prisma'
import { requireApiToken } from '../../../utils/api-token'

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
    if (!apiToken.scopes.includes('albums:read')) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Missing required scope: albums:read'
        })
    }

    const query = getQuery(event)

    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const skip = (page - 1) * limit

    const q = typeof query.q === 'string' ? query.q.trim() : ''
    const tag = typeof query.tag === 'string' ? query.tag.trim() : ''
    const tags = typeof query.tags === 'string'
        ? query.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []

    const fromEventDate = parseUnix(typeof query.fromEventDate === 'string' ? query.fromEventDate : '')
    const toEventDate = parseUnix(typeof query.toEventDate === 'string' ? query.toEventDate : '')

    const visibility = typeof query.visibility === 'string' ? query.visibility : 'all'
    const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt'
    const order = typeof query.order === 'string' ? query.order : 'desc'

    const where: any = {
        ownerId: apiToken.userId,
    }

    if (q) {
        where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
        ]
    }

    if (tag) {
        where.tags = { has: tag }
    } else if (tags.length > 0) {
        where.tags = { hasSome: tags }
    }

    if (fromEventDate || toEventDate) {
        where.eventDate = {}
        if (fromEventDate) where.eventDate.gte = fromEventDate
        if (toEventDate) where.eventDate.lte = toEventDate
    }

    if (visibility === 'public') {
        where.isPublic = true
    } else if (visibility === 'private') {
        where.isPublic = false
    }

    const orderBy: any = (() => {
        const dir = order === 'asc' ? 'asc' : 'desc'
        if (sortBy === 'eventDate') return { eventDate: dir }
        if (sortBy === 'title') return { title: dir }
        if (sortBy === 'updatedAt') return { updatedAt: dir }
        return { createdAt: dir }
    })()

    const [total, albums] = await Promise.all([
        prisma.album.count({ where }),
        prisma.album.findMany({
            where,
            skip,
            take: limit,
            include: {
                _count: {
                    select: { photos: true }
                }
            },
            orderBy
        })
    ])

    const timeline = albums.reduce((acc: Record<string, number>, album: any) => {
        const ts = album.eventDate ? Number(album.eventDate) : Number(album.createdAt)
        const date = new Date(ts * 1000)
        const key = Number.isNaN(date.getTime())
            ? 'unknown'
            : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    return {
        success: true,
        data: albums.map((album: any) => ({
            id: album.id,
            title: album.title,
            description: album.description,
            tags: album.tags,
            photoCount: album._count.photos,
            eventDate: album.eventDate ? Number(album.eventDate) : null,
            createdAt: Number(album.createdAt),
            updatedAt: Number(album.updatedAt),
            isPublic: album.isPublic
        })),
        pagination: {
            page,
            limit,
            total,
            hasMore: skip + albums.length < total,
        },
        summary: {
            filters: {
                q: q || null,
                tag: tag || null,
                tags,
                visibility,
                sortBy,
                order: order === 'asc' ? 'asc' : 'desc',
                fromEventDate: fromEventDate ? Number(fromEventDate) : null,
                toEventDate: toEventDate ? Number(toEventDate) : null,
            },
            timeline,
        }
    }
})
