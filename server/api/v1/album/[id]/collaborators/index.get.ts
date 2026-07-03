import { eq } from 'drizzle-orm'
import { albums, albumCollaborators } from '../../../../../db/schema'
import { requireAuth } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const albumId = getRouterParam(event, 'id')
        if (!albumId) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, albumId),
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        if (album.ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

        const collaborators = await db.query.albumCollaborators.findMany({
            where: eq(albumCollaborators.albumId, albumId),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        instagram: true,
                        avatarPath: true,
                    }
                }
            },
            orderBy: albumCollaborators.createdAt,
        })

        return {
            success: true,
            data: collaborators.map(c => ({
                id: c.id,
                role: c.role,
                userId: c.userId,
                createdAt: Number(c.createdAt),
                user: {
                    ...c.user,
                    avatar: c.user.avatarPath ? `/api/assets/avatar/${c.user.id}` : null,
                }
            })),
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch collaborators' })
    }
})
