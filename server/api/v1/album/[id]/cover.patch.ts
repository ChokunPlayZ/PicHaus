import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Album ID is required',
            })
        }

        const user = await requireAuth(event)
        const body = await readBody(event)
        const { photoId } = body

        // Check if album exists and user has permission
        const album = await prisma.album.findUnique({
            where: { id },
            include: {
                collaborators: {
                    where: {
                        userId: user.id,
                        role: {
                            in: ['admin', 'editor'],
                        },
                    },
                },
            },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        const isOwner = album.ownerId === user.id
        const isAdminCollaborator = album.collaborators.length > 0

        if (!isOwner && !isAdminCollaborator) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have permission to edit this album',
            })
        }

        // Verify photo belongs to album if photoId is provided
        if (photoId) {
            const photo = await prisma.photo.findUnique({
                where: { id: photoId },
            })

            if (!photo || photo.albumId !== id) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Photo does not belong to this album',
                })
            }
        }

        // Update album
        const updatedAlbum = await prisma.album.update({
            where: { id },
            data: {
                coverPhotoId: photoId || null,
            },
            include: {
                coverPhoto: {
                    select: {
                        id: true,
                        blurhash: true,
                    },
                },
            },
        })

        return {
            success: true,
            message: 'Album cover updated successfully',
            data: updatedAlbum.coverPhoto,
        }
    } catch (error: any) {
        console.error('Error updating album cover:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update album cover',
        })
    }
})
