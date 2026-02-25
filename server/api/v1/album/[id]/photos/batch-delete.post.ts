import prisma from '../../../../../utils/prisma'
import { requireAuth } from '../../../../../utils/auth'
import { deleteFile } from '../../../../../utils/upload'

/**
 * Batch delete photos from album
 */
export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const albumId = getRouterParam(event, 'id')
        const body = await readBody(event)
        const { ids } = body

        if (!albumId) {
            throw createError({ statusCode: 400, statusMessage: 'Album ID required' })
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Photo IDs required' })
        }

        if (!ids.every((photoId) => typeof photoId === 'string')) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid photo IDs format' })
        }

        if (ids.length > 200) {
            throw createError({ statusCode: 400, statusMessage: 'Too many photos requested (max 200)' })
        }

        // Check permissions
        const album = await prisma.album.findUnique({
            where: { id: albumId },
            include: {
                collaborators: true
            }
        })

        if (!album) {
            throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        }

        const isOwner = album.ownerId === user.id
        const isCollaborator = album.collaborators.some(c => c.userId === user.id && c.role !== 'viewer')
        const isAdmin = user.role === 'ADMIN'

        if (!isOwner && !isCollaborator && !isAdmin) {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }

        // Get photos to delete
        const photos = await prisma.photo.findMany({
            where: {
                id: { in: ids },
                albumId: albumId
            }
        })

        // Delete files
        await Promise.all(photos.map(async (photo) => {
            try {
                if (photo.storagePath) {
                    await deleteFile(photo.storagePath)
                }
                if (photo.thumbnailStoragePath) {
                    await deleteFile(photo.thumbnailStoragePath)
                }
            } catch (err) {
                console.error(`Failed to delete file for photo ${photo.id}`, err)
            }
        }))

        // Delete database records
        await prisma.photo.deleteMany({
            where: {
                id: { in: ids },
                albumId: albumId
            }
        })

        return { success: true, count: photos.length }

    } catch (error: any) {
        console.error('Batch delete error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete photos' })
    }
})
