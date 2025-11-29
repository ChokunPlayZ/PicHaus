import prisma from '../../../utils/prisma'
import { deleteFile } from '../../../utils/upload'
import { requireAuth } from '../../../utils/auth'

/**
 * Delete album and all associated photos
 */
export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Album ID is required',
            })
        }

        // Get authenticated user
        const user = await requireAuth(event)

        // Check if album exists and user is owner
        const album = await prisma.album.findUnique({
            where: { id },
            include: { photos: true },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        if (album.ownerId !== user.id) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Only the album owner can delete this album',
            })
        }

        // Delete photo files from disk
        if (album.photos && album.photos.length > 0) {
            for (const photo of album.photos) {
                if (photo.storagePath) {
                    await deleteFile(photo.storagePath)
                }
                if (photo.thumbnailStoragePath) {
                    await deleteFile(photo.thumbnailStoragePath)
                }
            }
        }

        // Delete album (cascade will delete photos and collaborators)
        await prisma.album.delete({
            where: { id },
        })

        return {
            success: true,
            message: 'Album deleted successfully',
        }
    } catch (error: any) {
        console.error('Error deleting album:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to delete album',
        })
    }
})
