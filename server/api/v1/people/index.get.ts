import { and, eq, count, countDistinct, ilike, inArray } from 'drizzle-orm'
import { people, faces, photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getVisibleAlbumIds } from '../../../utils/people'
import { parsePagination } from '../../../utils/pagination'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const { page, limit, offset } = parsePagination(query)
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const visibleAlbumIds = await getVisibleAlbumIds(user.id)
    if (visibleAlbumIds.length === 0) {
        return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } }
    }

    const where = and(
        inArray(albums.id, visibleAlbumIds),
        search ? ilike(people.name, `%${search.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
    )
    const [rows, countRows] = await Promise.all([
        db.select({
            id: people.id,
            name: people.name,
            representativeFaceId: people.representativeFaceId,
            faceCount: count(faces.id),
            createdAt: people.createdAt,
            updatedAt: people.updatedAt,
        })
            .from(people)
            .innerJoin(faces, eq(faces.personId, people.id))
            .innerJoin(photos, eq(faces.photoId, photos.id))
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(where)
            .groupBy(people.id)
            .orderBy(people.name, people.id)
            .limit(limit)
            .offset(offset),
        db.select({ total: countDistinct(people.id) })
            .from(people)
            .innerJoin(faces, eq(faces.personId, people.id))
            .innerJoin(photos, eq(faces.photoId, photos.id))
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(where),
    ])
    const total = Number(countRows[0]?.total ?? 0)

    return {
        success: true,
        data: rows.map(row => ({
            id: row.id,
            name: row.name,
            representativeFaceId: row.representativeFaceId,
            representativeFaceUrl: row.representativeFaceId
                ? `/api/v1/faces/${row.representativeFaceId}/thumb`
                : null,
            faceCount: Number(row.faceCount),
            createdAt: Number(row.createdAt),
            updatedAt: Number(row.updatedAt),
        })),
        pagination: { page, limit, total, hasMore: offset + rows.length < total },
    }
})
