import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../../db/schema'
import { requireAuth } from '../../../../../utils/auth'
import { deleteFile } from '../../../../../utils/upload'
import { requireRouterParamValue, requireStringArray } from '../../../../../utils/api'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const albumId = requireRouterParamValue(event, 'id', 'Album ID')
        const body = await readBody(event)
        const ids = requireStringArray(body.ids, 'Photo IDs', {
            maxLength: 200,
            invalidMessage: 'Invalid photo IDs format',
            maxLengthMessage: 'Too many photos requested (max 200)',
        })

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, albumId),
            with: { collaborators: true },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

        const isOwner = album.ownerId === user.id
        const isCollaborator = album.collaborators.some(c => c.userId === user.id && c.role !== 'viewer')
        const isAdmin = user.role === 'ADMIN'
        if (!isOwner && !isCollaborator && !isAdmin) throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

        const photosToDelete = await db.select()
            .from(photos)
            .where(and(inArray(photos.id, ids), eq(photos.albumId, albumId)))

        if (!isOwner && !isAdmin) {
            const hasUnauthorizedPhoto = photosToDelete.some(photo => photo.uploaderId !== user.id)
            if (hasUnauthorizedPhoto) {
                throw createError({ statusCode: 403, statusMessage: 'You can only delete your own photos' })
            }
        }

        await Promise.all(photosToDelete.map(async (photo) => {
            try {
                if (photo.storagePath) await deleteFile(photo.storagePath)
                if (photo.thumbnailStoragePath) await deleteFile(photo.thumbnailStoragePath)
            } catch (err) {
                console.error(`Failed to delete file for photo ${photo.id}`, err)
            }
        }))

        await db.delete(photos).where(and(inArray(photos.id, ids), eq(photos.albumId, albumId)))

        return { success: true, count: photosToDelete.length }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete photos' })
    }
})
