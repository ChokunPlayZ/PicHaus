import { eq, and, ilike, or, asc, desc, count, sql, arrayContains, arrayOverlaps } from 'drizzle-orm'
import { albums } from '../../../db/schema'
import { requireApiToken } from '../../../utils/api-token'

const parseUnix = (value: unknown): bigint | null => {
    if (typeof value !== 'string' || value.trim() === '') return null
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return BigInt(Math.trunc(n))
}

export default defineEventHandler(async (event) => {
    const apiToken = await requireApiToken(event)
    if (!apiToken.scopes.includes('albums:read')) {
        throw createError({ statusCode: 403, statusMessage: 'Missing required scope: albums:read' })
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const skip = (page - 1) * limit
    const q = typeof query.q === 'string' ? query.q.trim() : ''
    const tag = typeof query.tag === 'string' ? query.tag.trim() : ''
    const tags = typeof query.tags === 'string' ? query.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const fromEventDate = parseUnix(typeof query.fromEventDate === 'string' ? query.fromEventDate : '')
    const toEventDate = parseUnix(typeof query.toEventDate === 'string' ? query.toEventDate : '')
    const visibility = typeof query.visibility === 'string' ? query.visibility : 'all'
    const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt'
    const order = typeof query.order === 'string' ? query.order : 'desc'
    const orderFn = order === 'asc' ? asc : desc

    const sortCol = sortBy === 'eventDate' ? albums.eventDate
        : sortBy === 'title' ? albums.title
        : sortBy === 'updatedAt' ? albums.updatedAt
        : albums.createdAt

    const conditions = [
        eq(albums.ownerId, apiToken.userId),
        q ? or(ilike(albums.title, `%${q}%`), ilike(albums.description, `%${q}%`)) : undefined,
        tag ? sql`${tag} = ANY(${albums.tags})` : undefined,
        tags.length > 0 ? sql`${albums.tags} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[]` : undefined,
        fromEventDate ? sql`${albums.eventDate} >= ${fromEventDate}` : undefined,
        toEventDate ? sql`${albums.eventDate} <= ${toEventDate}` : undefined,
        visibility === 'public' ? eq(albums.isPublic, true) : undefined,
        visibility === 'private' ? eq(albums.isPublic, false) : undefined,
    ].filter(Boolean) as any[]

    const where = conditions.length > 1 ? and(...conditions) : conditions[0]

    const [albumRows, [{ total }]] = await Promise.all([
        db.select({
            id: albums.id,
            title: albums.title,
            description: albums.description,
            tags: albums.tags,
            isPublic: albums.isPublic,
            eventDate: albums.eventDate,
            createdAt: albums.createdAt,
            updatedAt: albums.updatedAt,
            photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."albumId" = ${albums.id})`,
        })
            .from(albums)
            .where(where)
            .orderBy(orderFn(sortCol))
            .limit(limit)
            .offset(skip),
        db.select({ total: count() }).from(albums).where(where),
    ])

    const timeline = albumRows.reduce((acc: Record<string, number>, album) => {
        const ts = album.eventDate ? Number(album.eventDate) : Number(album.createdAt)
        const date = new Date(ts * 1000)
        const key = Number.isNaN(date.getTime()) ? 'unknown'
            : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    return {
        success: true,
        data: albumRows.map(album => ({
            id: album.id,
            title: album.title,
            description: album.description,
            tags: album.tags,
            photoCount: Number(album.photoCount),
            eventDate: album.eventDate ? Number(album.eventDate) : null,
            createdAt: Number(album.createdAt),
            updatedAt: Number(album.updatedAt),
            isPublic: album.isPublic,
        })),
        pagination: { page, limit, total, hasMore: skip + albumRows.length < total },
        summary: {
            filters: { q: q || null, tag: tag || null, tags, visibility, sortBy, order: order === 'asc' ? 'asc' : 'desc', fromEventDate: fromEventDate ? Number(fromEventDate) : null, toEventDate: toEventDate ? Number(toEventDate) : null },
            timeline,
        },
    }
})
