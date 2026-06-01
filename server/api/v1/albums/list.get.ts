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

    const [countRows, coverPhotoRows] = await Promise.all([
        db.select({ albumId: photos.albumId, photoCount: count() })
            .from(photos)
            .where(inArray(photos.albumId, albumIds))
            .groupBy(photos.albumId),
        (async () => {
            const coverIds = albumRows.map(a => a.coverPhotoId).filter(Boolean) as string[]
            if (coverIds.length === 0) return []
            return db.select({ id: photos.id, blurhash: photos.blurhash })
                .from(photos)
                .where(inArray(photos.id, coverIds))
        })(),
    ])

    const countMap = new Map(countRows.map(r => [r.albumId, r.photoCount]))
    const coverMap = new Map(coverPhotoRows.map(p => [p.id, p]))

    return {
        success: true,
        data: albumRows.map(album => ({
            id: album.id,
            name: album.title,
            photoCount: countMap.get(album.id) ?? 0,
            coverPhoto: album.coverPhotoId ? (coverMap.get(album.coverPhotoId) ?? null) : null,
        })),
    }
})
