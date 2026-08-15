import { eq, count, inArray } from 'drizzle-orm'
import { people, faces, photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getVisibleAlbumIds } from '../../../utils/people'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const visibleAlbumIds = await getVisibleAlbumIds(user.id)
    if (visibleAlbumIds.length === 0) {
        return { success: true, data: [] }
    }

    const rows = await db.select({
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
    }
})
