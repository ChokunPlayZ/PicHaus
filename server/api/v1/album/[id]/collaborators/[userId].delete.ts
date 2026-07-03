import { eq, and } from 'drizzle-orm'
import { albums, albumCollaborators } from '../../../../../db/schema'
import { requireAuth } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const albumId = getRouterParam(event, 'id')
        const targetUserId = getRouterParam(event, 'userId')
        if (!albumId || !targetUserId) throw createError({ statusCode: 400, statusMessage: 'Album ID and User ID are required' })

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, albumId),
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        if (album.ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

        const [deletedCollab] = await db.delete(albumCollaborators).where(and(
            eq(albumCollaborators.albumId, albumId),
            eq(albumCollaborators.userId, targetUserId),
        )).returning()

        if (!deletedCollab) {
            throw createError({ statusCode: 404, statusMessage: 'Collaborator not found' })
        }

        return {
            success: true,
            message: 'Collaborator removed successfully',
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to remove collaborator' })
    }
})
