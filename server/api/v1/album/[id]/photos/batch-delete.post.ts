import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../../db/schema'
import { requireAuth } from '../../../../../utils/auth'
import { deleteFile } from '../../../../../utils/upload'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const albumId = getRouterParam(event, 'id')
        const body = await readBody(event)
        const { ids } = body

        if (!albumId) throw createError({ statusCode: 400, statusMessage: 'Album ID required' })
        if (!ids || !Array.isArray(ids) || ids.length === 0) throw createError({ statusCode: 400, statusMessage: 'Photo IDs required' })
        if (!ids.every((photoId) => typeof photoId === 'string')) throw createError({ statusCode: 400, statusMessage: 'Invalid photo IDs format' })
        if (ids.length > 200) throw createError({ statusCode: 400, statusMessage: 'Too many photos requested (max 200)' })

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
