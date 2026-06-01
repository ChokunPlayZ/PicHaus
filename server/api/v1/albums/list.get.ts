import { eq, desc, count, inArray } from 'drizzle-orm'
import { albums, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const albumRows = await db.select({
        id: albums.id,
        title: albums.title,
        coverPhotoId: albums.coverPhotoId,
    })
        .from(albums)
        .where(eq(albums.ownerId, user.id))
        .orderBy(desc(albums.createdAt))

    if (albumRows.length === 0) return { success: true, data: [] }

    const albumIds = albumRows.map(a => a.id)
    const coverIds = albumRows.map(a => a.coverPhotoId).filter(Boolean) as string[]
    const noCoverIds = albumRows.filter(a => !a.coverPhotoId).map(a => a.id)

    const [countRows, coverPhotoRows, fallbackRows] = await Promise.all([
        db.select({ albumId: photos.albumId, photoCount: count() })
            .from(photos)
            .where(inArray(photos.albumId, albumIds))
            .groupBy(photos.albumId),
        coverIds.length > 0
            ? db.select({ id: photos.id, blurhash: photos.blurhash })
                .from(photos)
                .where(inArray(photos.id, coverIds))
            : Promise.resolve([]),
        noCoverIds.length > 0
            ? db.selectDistinctOn([photos.albumId], {
                albumId: photos.albumId,
                id: photos.id,
                blurhash: photos.blurhash,
            })
                .from(photos)
                .where(inArray(photos.albumId, noCoverIds))
                .orderBy(photos.albumId, desc(photos.createdAt))
            : Promise.resolve([]),
    ])

    const countMap = new Map(countRows.map(r => [r.albumId, r.photoCount]))
    const coverMap = new Map(coverPhotoRows.map(p => [p.id, p]))
    const fallbackMap = new Map(fallbackRows.map(p => [p.albumId!, { id: p.id, blurhash: p.blurhash }]))

    return {
        success: true,
        data: albumRows.map(album => {
            const coverPhoto = album.coverPhotoId
                ? (coverMap.get(album.coverPhotoId) ?? null)
                : (fallbackMap.get(album.id) ?? null)
            return {
                id: album.id,
                name: album.title,
                photoCount: countMap.get(album.id) ?? 0,
                coverPhoto,
            }
        }),
    }
})
