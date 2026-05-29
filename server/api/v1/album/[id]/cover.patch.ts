import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const user = await requireAuth(event)
        const body = await readBody(event)
        const { photoId } = body

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
            with: { collaborators: { where: and(eq(albumCollaborators.userId, user.id), inArray(albumCollaborators.role, ['admin', 'editor'])) } },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        if (album.ownerId !== user.id && album.collaborators.length === 0) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to edit this album' })
        }

        if (photoId) {
            const photo = await db.query.photos.findFirst({ where: eq(photos.id, photoId) })
            if (!photo || photo.albumId !== id) {
                throw createError({ statusCode: 400, statusMessage: 'Photo does not belong to this album' })
            }
        }

        const [updatedAlbum] = await db.update(albums)
            .set({ coverPhotoId: photoId || null })
            .where(eq(albums.id, id))
            .returning()

        let coverPhoto = null
        if (updatedAlbum.coverPhotoId) {
            const p = await db.query.photos.findFirst({
                where: eq(photos.id, updatedAlbum.coverPhotoId),
                columns: { id: true, blurhash: true },
            })
            coverPhoto = p ?? null
        }

        return { success: true, message: 'Album cover updated successfully', data: coverPhoto }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update album cover' })
    }
})
