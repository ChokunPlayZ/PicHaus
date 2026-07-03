import { eq, and } from 'drizzle-orm'
import { albums, albumCollaborators, users } from '../../../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../../../utils/auth'

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

        const body = await readBody(event)
        const { email, role } = body

        if (!email) throw createError({ statusCode: 400, statusMessage: 'Email is required' })
        const targetRole = ['admin', 'editor', 'viewer'].includes(role) ? role : 'editor'

        const targetUser = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase().trim()),
        })

        if (!targetUser) {
            throw createError({ statusCode: 404, statusMessage: 'User not found. They must register first.' })
        }

        if (album.ownerId === targetUser.id) {
            throw createError({ statusCode: 400, statusMessage: 'The owner cannot be added as a collaborator' })
        }

        const existingCollab = await db.query.albumCollaborators.findFirst({
            where: and(
                eq(albumCollaborators.albumId, albumId),
                eq(albumCollaborators.userId, targetUser.id),
            ),
        })

        if (existingCollab) {
            throw createError({ statusCode: 400, statusMessage: 'This user is already a collaborator' })
        }

        const [newCollab] = await db.insert(albumCollaborators).values({
            albumId,
            userId: targetUser.id,
            role: targetRole,
            createdAt: getUnixTimestamp(),
        }).returning()

        return {
            success: true,
            message: 'Collaborator added successfully',
            data: {
                id: newCollab.id,
                role: newCollab.role,
                userId: newCollab.userId,
                createdAt: Number(newCollab.createdAt),
                user: {
                    id: targetUser.id,
                    name: targetUser.name,
                    email: targetUser.email,
                    instagram: targetUser.instagram,
                    avatar: targetUser.avatarPath ? `/api/assets/avatar/${targetUser.id}` : null,
                }
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to add collaborator' })
    }
})
