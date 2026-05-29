import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const albumId = getRouterParam(event, 'id')
        const body = await readBody(event)
        const hashes = body.hashes

        if (!albumId || !hashes || !Array.isArray(hashes)) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid request parameters' })
        }

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, albumId),
            with: { collaborators: true },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

        const isOwner = album.ownerId === user.id
        const isCollaborator = album.collaborators.some(c => c.userId === user.id && ['admin', 'editor'].includes(c.role))
        if (!isOwner && !isCollaborator) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

        const existingPhotos = await db.select({ fileHash: photos.fileHash })
            .from(photos)
            .where(and(eq(photos.albumId, albumId), inArray(photos.fileHash, hashes)))
            .groupBy(photos.fileHash)

        return { success: true, duplicates: existingPhotos.map(p => p.fileHash) }
    } catch (error: any) {
        throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Failed to check duplicates' })
    }
})
