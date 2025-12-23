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
            // Check if user exists and has access
            // We can optimize this by not querying user if we trust the token ID to check collaborators
            // But let's be safe.
            // Actually, for guest users, the authToken IS the user ID.

            if (photo.album.ownerId === authToken) {
                hasAccess = true
            } else {
                const isCollaborator = photo.album.collaborators.some(c => c.userId === authToken)
                if (isCollaborator) {
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
