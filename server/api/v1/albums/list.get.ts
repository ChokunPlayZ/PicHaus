import { eq, desc, sql } from 'drizzle-orm'
import { albums, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const rows = await db.select({
        id: albums.id,
        title: albums.title,
        description: albums.description,
        tags: albums.tags,
        photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."albumId" = ${albums.id})`,
        latestPhotoId: sql<string | null>`(SELECT id FROM photos WHERE photos."albumId" = ${albums.id} ORDER BY "createdAt" DESC LIMIT 1)`,
        latestPhotoBlurhash: sql<string | null>`(SELECT blurhash FROM photos WHERE photos."albumId" = ${albums.id} ORDER BY "createdAt" DESC LIMIT 1)`,
    })
        .from(albums)
        .where(eq(albums.ownerId, user.id))
        .orderBy(desc(albums.createdAt))

    return {
        success: true,
        data: rows.map(album => ({
            id: album.id,
            name: album.title,
            description: album.description,
            tags: album.tags,
            photoCount: Number(album.photoCount),
            coverPhoto: album.latestPhotoId
                ? { id: album.latestPhotoId, blurhash: album.latestPhotoBlurhash ?? '' }
                : null,
        })),
    }
})
