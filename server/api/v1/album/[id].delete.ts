import { eq } from 'drizzle-orm'
import { albums, photos } from '../../../db/schema'
import { deleteFile } from '../../../utils/upload'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
            with: { photos: true },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        if (album.ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Only the album owner can delete this album' })

        for (const photo of album.photos) {
            if (photo.storagePath) await deleteFile(photo.storagePath)
            if (photo.thumbnailStoragePath) await deleteFile(photo.thumbnailStoragePath)
        }

        await db.delete(albums).where(eq(albums.id, id))
        return { success: true, message: 'Album deleted successfully' }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete album' })
    }
})
