import prisma from '../../../../utils/prisma'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'

/**
 * Get all photo URLs for an album (for download all)
 */
export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')

        // Check authentication (optional, depending on album privacy)
        // For now, we'll allow public albums to be downloaded without auth
        // But we should check permissions if it's private
        const authUserId = getAuthUserId(event)
        const now = getUnixTimestamp()
        let user = null
        if (authUserId) {
            user = await prisma.user.findUnique({
                where: { id: authUserId },
            })
        }

        const album = await prisma.album.findUnique({
            where: { id },
            include: {
                collaborators: true,
            },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        // Check permissions
        if (!album.isPublic) {
            let hasAccess = false

            // Check for share link access (guest)
            const shareToken = getCookie(event, `album-access-${id}`)
            if (shareToken) {
                const link = await prisma.shareLink.findUnique({
                    where: { token: shareToken }
                })
                if (link && link.albumId === id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasAccess = true
                }
            }

            // Check for user access (owner/collaborator)
            if (!hasAccess && user) {
                const isOwner = album.ownerId === user.id
                const isCollaborator = album.collaborators.some(c => c.userId === user.id)
                if (isOwner || isCollaborator) {
                    hasAccess = true
                }
            }

            if (!hasAccess) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Forbidden',
                })
            }
        }

        // Fetch all photos
        const photos = await prisma.photo.findMany({
            where: { albumId: id },
            select: {
                id: true,
                originalName: true,
                filename: true,
            },
        })

        return {
            success: true,
            data: photos,
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch photos',
        })
    }
})
