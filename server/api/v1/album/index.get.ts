import { eq, or, exists, and, desc, inArray, sql } from 'drizzle-orm'
import { albums, users, albumCollaborators, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        const where = user.role === 'ADMIN'
            ? undefined
            : or(
                eq(albums.ownerId, user.id),
                exists(
                    db.select().from(albumCollaborators).where(
                        and(
                            eq(albumCollaborators.albumId, albums.id),
                            eq(albumCollaborators.userId, user.id),
                        )
                    )
                )
            )

        const rows = await db.select({
            id: albums.id,
            title: albums.title,
            description: albums.description,
            tags: albums.tags,
            isPublic: albums.isPublic,
            eventDate: albums.eventDate,
            createdAt: albums.createdAt,
            updatedAt: albums.updatedAt,
            coverPhotoId: albums.coverPhotoId,
            ownerId: albums.ownerId,
            ownerName: users.name,
            ownerInstagram: users.instagram,
            photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."albumId" = ${albums.id})`,
            collaboratorCount: sql<number>`(SELECT COUNT(*) FROM album_collaborators WHERE album_collaborators."albumId" = ${albums.id})`,
            latestPhotoId: sql<string | null>`(SELECT id FROM photos WHERE photos."albumId" = ${albums.id} ORDER BY "createdAt" DESC LIMIT 1)`,
            latestPhotoBlurhash: sql<string | null>`(SELECT blurhash FROM photos WHERE photos."albumId" = ${albums.id} ORDER BY "createdAt" DESC LIMIT 1)`,
        })
            .from(albums)
            .leftJoin(users, eq(albums.ownerId, users.id))
            .where(where)
            .orderBy(desc(albums.createdAt))

        // Batch-fetch cover photos by ID
        const coverPhotoIds = [...new Set(rows.map(r => r.coverPhotoId).filter(Boolean))] as string[]
        const coverPhotoRows = coverPhotoIds.length > 0
            ? await db.select({ id: photos.id, blurhash: photos.blurhash }).from(photos).where(inArray(photos.id, coverPhotoIds))
            : []
        const coverPhotoMap = new Map(coverPhotoRows.map(p => [p.id, p]))

        return {
            success: true,
            data: rows.map(album => {
                const coverPhoto = album.coverPhotoId
                    ? (coverPhotoMap.get(album.coverPhotoId) ?? null)
                    : null
                const latestPhoto = album.latestPhotoId
                    ? { id: album.latestPhotoId, blurhash: album.latestPhotoBlurhash ?? '' }
                    : null
                return {
                    id: album.id,
                    name: album.title,
                    description: album.description,
                    tags: album.tags,
                    isPublic: album.isPublic,
                    eventDate: album.eventDate ? Number(album.eventDate) : null,
                    createdAt: Number(album.createdAt),
                    updatedAt: Number(album.updatedAt),
                    owner: { id: album.ownerId, name: album.ownerName, instagram: album.ownerInstagram },
                    _count: { photos: Number(album.photoCount), collaborators: Number(album.collaboratorCount) },
                    coverPhoto: coverPhoto || latestPhoto,
                }
            }),
        }
    } catch (error) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch albums' })
    }
})
