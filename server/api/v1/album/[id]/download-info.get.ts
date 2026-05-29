import { eq } from 'drizzle-orm'
import { albums, photos, shareLinks, users } from '../../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        const authUserId = getAuthUserId(event)
        const now = getUnixTimestamp()

        let user = null
        if (authUserId) {
            user = await db.query.users.findFirst({ where: eq(users.id, authUserId) }) ?? null
        }

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id!),
            with: { collaborators: true },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

        if (!album.isPublic) {
            let hasAccess = false

            const shareToken = getCookie(event, `album-access-${id}`)
            if (shareToken) {
                const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
                if (link && link.albumId === id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasAccess = true
                }
            }

            if (!hasAccess && user) {
                const isOwner = album.ownerId === user.id
                const isCollaborator = album.collaborators.some(c => c.userId === user.id)
                if (isOwner || isCollaborator) hasAccess = true
            }

            if (!hasAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }

        const photoRows = await db.select({ id: photos.id, originalName: photos.originalName, filename: photos.filename })
            .from(photos)
            .where(eq(photos.albumId, id!))

        return { success: true, data: photoRows }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch photos' })
    }
})
