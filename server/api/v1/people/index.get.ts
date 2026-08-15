import { eq, count, inArray } from 'drizzle-orm'
import { people, faces, photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getVisibleAlbumIds } from '../../../utils/people'
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const visibleAlbumIds = await getVisibleAlbumIds(user.id)
    if (visibleAlbumIds.length === 0) {
        return { success: true, data: [], pagination: { total: 0, hasMore: false } }
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
    const offset = (page - 1) * limit

    const [rows, totalResult] = await Promise.all([
        db.select({
            id: people.id,
            name: people.name,
            instagram: people.instagram,
            representativeFaceId: people.representativeFaceId,
            faceCount: count(faces.id),
            createdAt: people.createdAt,
            updatedAt: people.updatedAt,
        })
            .from(people)
            .innerJoin(faces, eq(faces.personId, people.id))
            .innerJoin(photos, eq(faces.photoId, photos.id))
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(inArray(albums.id, visibleAlbumIds))
            .groupBy(people.id)
            .orderBy(people.name)
            .limit(limit)
            .offset(offset),
        db.select({ total: count() })
            .from(people)
            .innerJoin(faces, eq(faces.personId, people.id))
            .innerJoin(photos, eq(faces.photoId, photos.id))
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(inArray(albums.id, visibleAlbumIds)),
    ])

    const total = Number(totalResult[0]?.total ?? 0)

    return {
        success: true,
        data: rows.map(row => ({
            id: row.id,
            name: row.name,
            instagram: row.instagram,
            representativeFaceId: row.representativeFaceId,
            representativeFaceUrl: row.representativeFaceId
                ? `/api/v1/faces/${row.representativeFaceId}/thumb`
                : null,
            faceCount: Number(row.faceCount),
            createdAt: Number(row.createdAt),
            updatedAt: Number(row.updatedAt),
        })),
        pagination: {
            total,
            page,
            limit,
            hasMore: offset + rows.length < total,
        },
    }
})
