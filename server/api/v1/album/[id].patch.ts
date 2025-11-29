import prisma from '../../../utils/prisma'
import { getUnixTimestamp, requireAuth } from '../../../utils/auth'

/**
 * Update album details
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

        const body = await readBody(event)
        const now = getUnixTimestamp()

        // Update album
        const updatedAlbum = await prisma.album.update({
            where: { id },
            data: {
                title: body.name ?? album.title,
                description: body.description !== undefined ? body.description : album.description,
                eventDate: body.eventDate !== undefined
                    ? (body.eventDate ? BigInt(body.eventDate) : null)
                    : album.eventDate,
                isPublic: body.isPublic ?? album.isPublic,
                updatedAt: now,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        return {
            success: true,
            message: 'Album updated successfully',
            data: {
                ...updatedAlbum,
                name: updatedAlbum.title, // Map title to name for frontend
                createdAt: Number(updatedAlbum.createdAt),
                updatedAt: Number(updatedAlbum.updatedAt),
                eventDate: updatedAlbum.eventDate ? Number(updatedAlbum.eventDate) : null,
            },
        }
    } catch (error: any) {
        console.error('Error updating album:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update album',
        })
    }
})
