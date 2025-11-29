import prisma from '../../../utils/prisma'

/**
 * Get single album details
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

        // Get authenticated user (optional for public albums)
        const authToken = getCookie(event, 'auth-token')

        const album = await prisma.album.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        instagram: true,
                    },
                },
                photos: {
                    select: {
                        id: true,
                        url: true,
                        thumbnailUrl: true,
                        filename: true,
                        dateTaken: true,
                        createdAt: true,
                        uploader: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                collaborators: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        photos: true,
                        collaborators: true,
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

        // Check permissions
        const isOwner = authToken === album.ownerId
        const isCollaborator = album.collaborators.some((c: any) => c.userId === authToken)
        const canView = album.isPublic || isOwner || isCollaborator

        if (!canView) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have permission to view this album',
            })
        }

        // Convert BigInt timestamps
        const photos = album.photos.map((photo: any) => ({
            ...photo,
            dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
            createdAt: Number(photo.createdAt),
        }))

        const collaborators = album.collaborators.map((collab: any) => ({
            ...collab,
            createdAt: Number(collab.createdAt),
        }))

        return {
            success: true,
            data: {
                ...album,
                name: album.title, // Map title to name for frontend
                uploadLinkToken: album.uploadLink, // Map uploadLink to uploadLinkToken for frontend
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                photos,
                collaborators,
                permissions: {
                    isOwner,
                    isCollaborator,
                    canEdit: isOwner || isCollaborator,
                    canDelete: isOwner,
                },
            },
        }
    } catch (error: any) {
        console.error('Error fetching album:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch album',
        })
    }
})
