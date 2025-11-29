import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

/**
 * Update photo metadata
 */
export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const id = getRouterParam(event, 'id')
        const body = await readBody(event)

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Photo ID required' })
        }

        // Check permissions
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
            throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
        }

        const isOwner = photo.album.ownerId === user.id
        const isCollaborator = photo.album.collaborators.some(c => c.userId === user.id && c.role !== 'viewer')
        const isAdmin = user.role === 'ADMIN'

        if (!isOwner && !isCollaborator && !isAdmin) {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }

        // Update photo
        const updatedPhoto = await prisma.photo.update({
            where: { id },
            data: {
                dateTaken: body.dateTaken ? BigInt(body.dateTaken) : undefined,
                cameraModel: body.cameraModel,
                lens: body.lens,
                focalLength: body.focalLength,
                aperture: body.aperture,
                shutterSpeed: body.shutterSpeed,
                iso: body.iso ? Number(body.iso) : undefined,
            }
        })

        return {
            success: true,
            data: {
                ...updatedPhoto,
                dateTaken: updatedPhoto.dateTaken ? Number(updatedPhoto.dateTaken) : null,
                createdAt: Number(updatedPhoto.createdAt),
                updatedAt: Number(updatedPhoto.updatedAt),
            }
        }

    } catch (error: any) {
        console.error('Update photo error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update photo' })
    }
})
