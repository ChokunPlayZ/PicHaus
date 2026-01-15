import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { join } from 'path'
import prisma from '../../../utils/prisma'
import { getAbsoluteFilePath } from '../../../utils/upload'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

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
        const authToken = getCookie(event, 'auth-token')
        if (authToken) {
            if (photo.album.ownerId === authToken) {
                hasAccess = true
            } else {
                const isCollaborator = photo.album.collaborators.some(c => c.userId === authToken)
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
                if (link && link.albumId === photo.album.id) {
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
    if (photo.thumbnailStoragePath) {
        filePath = getAbsoluteFilePath(photo.thumbnailStoragePath)
    } else {
        // Fallback to full image if no thumb
        return sendRedirect(event, `/api/assets/${id}/full`)
    }

    try {
        const stats = await stat(filePath)

        // Thumbnails are usually WebP now
        setHeader(event, 'Content-Type', 'image/webp')
        setHeader(event, 'Content-Length', stats.size)
        setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable') // Cache for 1 year

        return sendStream(event, createReadStream(filePath))
    } catch (error) {
        // If thumb file missing, redirect to full
        return sendRedirect(event, `/api/assets/${id}/full`)
    }
})
