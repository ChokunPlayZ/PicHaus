import prisma from '../../../utils/prisma'

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
        const authToken = getCookie(event, 'auth-token')

        if (!authToken) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Not authenticated',
            })
        }

        // Check if album exists and user is owner
        const album = await prisma.album.findUnique({
            where: { id },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        if (album.ownerId !== authToken) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Only the album owner can delete this album',
            })
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
