import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const albumId = getRouterParam(event, 'id')
        const body = await readBody(event)
        const hashes = body.hashes

        if (!albumId || !hashes || !Array.isArray(hashes)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid request parameters',
            })
        }

        // Get authenticated user (or check if album is public/share link logic if needed later)
        // For now, assume upload requires auth
        const user = await requireAuth(event)

        // Check if album exists and user has permission (abbreviated check for now, relies on upload endpoint logic implicitly or should duplicate?)
        // Ideally we should replicate permission check logic or export it. For performance of this check, we might skip heavy permission logic if we assume the subsequent upload will block it,
        // BUT to prevent information leakage (knowing what photos exist), we MUST verify permissions.

        const album = await prisma.album.findUnique({
            where: { id: albumId },
            include: { collaborators: true }
        })

        if (!album) {
            throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        }

        const isOwner = album.ownerId === user.id
        const isCollaborator = album.collaborators.some(c => c.userId === user.id && ['admin', 'editor'].includes(c.role))

        if (!isOwner && !isCollaborator) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }

        // Find duplicates
        const existingPhotos = await prisma.photo.findMany({
            where: {
                albumId,
                fileHash: {
                    in: hashes
                }
            },
            select: {
                fileHash: true
            }
        })

        const duplicates = existingPhotos.map(p => p.fileHash)

        return {
            success: true,
            duplicates
        }

    } catch (error: any) {
        console.error('Check duplicates error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Failed to check duplicates'
        })
    }
})
