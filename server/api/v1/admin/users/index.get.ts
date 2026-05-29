import { eq, ilike, or, desc, count, sql } from 'drizzle-orm'
import { users, albums, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

        const query = getQuery(event)
        const page = Math.max(1, Number(query.page) || 1)
        const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
        const search = query.search as string | undefined
        const skip = (page - 1) * limit

        const where = search
            ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
            : undefined

        const [rows, [{ total }]] = await Promise.all([
            db.select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
                albumCount: sql<number>`(SELECT COUNT(*) FROM albums WHERE albums."ownerId" = ${users.id})`,
                photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."uploaderId" = ${users.id})`,
            })
                .from(users)
                .where(where)
                .orderBy(desc(users.createdAt))
                .limit(limit)
                .offset(skip),
            db.select({ total: count() }).from(users).where(where),
        ])

        return {
            success: true,
            data: rows.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: Number(u.createdAt),
                _count: { ownedAlbums: Number(u.albumCount), uploadedPhotos: Number(u.photoCount) },
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to list users' })
    }
})
