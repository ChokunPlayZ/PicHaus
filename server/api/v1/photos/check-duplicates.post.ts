import { eq, or, exists, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readBody(event)
    const { hashes } = body

    if (!hashes || !Array.isArray(hashes)) {
        throw createError({ statusCode: 400, statusMessage: 'Hashes array is required' })
    }
    if (hashes.length > 500) {
        throw createError({ statusCode: 400, statusMessage: 'Batch size too large (max 500)' })
    }

    const accessibleAlbums = await db.select({ id: albums.id })
        .from(albums)
        .where(
            or(
                eq(albums.ownerId, user.id),
                exists(
                    db.select().from(albumCollaborators).where(
                        and(eq(albumCollaborators.albumId, albums.id), eq(albumCollaborators.userId, user.id))
                    )
                )
            )
        )

    const albumIds = accessibleAlbums.map(a => a.id)
    if (albumIds.length === 0) return { success: true, duplicates: [] }

    const existingPhotos = await db.select({ fileHash: photos.fileHash })
        .from(photos)
        .where(and(inArray(photos.fileHash, hashes), inArray(photos.albumId, albumIds)))
        .groupBy(photos.fileHash)

    return { success: true, duplicates: existingPhotos.map(p => p.fileHash) }
})
