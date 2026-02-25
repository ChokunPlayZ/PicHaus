import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import prisma from '../../../utils/prisma'
import { getAbsoluteFilePath } from '../../../utils/upload'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const now = getUnixTimestamp()

    const photo = await prisma.photo.findUnique({
        where: { id },
        include: {
            album: {
                include: {
                    collaborators: true
                }
            }
        }
    })

    if (!photo) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Photo not found',
        })
    }

    // Permission Check
    let hasAccess = false
    if (photo.album.isPublic) {
        hasAccess = true
    } else {
        const authUserId = getAuthUserId(event)
        if (authUserId) {
            // Check if user exists and has access
            // We can optimize this by not querying user if we trust the token ID to check collaborators
            // But let's be safe.
            // Actually, for guest users, the authToken IS the user ID.

            if (photo.album.ownerId === authUserId) {
                hasAccess = true
            } else {
                const isCollaborator = photo.album.collaborators.some(c => c.userId === authUserId)
                if (isCollaborator) {
                    hasAccess = true
                }
            }
        }

        // Check for share link access (guest with share link)
        if (!hasAccess) {
            const shareToken = getCookie(event, `album-access-${photo.album.id}`)
            if (shareToken) {
                const link = await prisma.shareLink.findUnique({
                    where: { token: shareToken }
                })
                if (link && link.albumId === photo.album.id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasAccess = true
                }
            }
        }
    }

    if (!hasAccess) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
        })
    }

    // Determine file path
    let filePath: string
    if (photo.storagePath) {
        filePath = getAbsoluteFilePath(photo.storagePath)
    } else {
        throw createError({
            statusCode: 404,
            statusMessage: 'File path not found',
        })
    }

    try {
        const stats = await stat(filePath)

        setHeader(event, 'Content-Type', photo.mimeType)
        setHeader(event, 'Content-Length', stats.size)
        setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable') // Cache for 1 year

        return sendStream(event, createReadStream(filePath))
    } catch (error) {
        console.error('File serve error:', error)
        throw createError({
            statusCode: 404,
            statusMessage: 'File not found on server',
        })
    }
})
