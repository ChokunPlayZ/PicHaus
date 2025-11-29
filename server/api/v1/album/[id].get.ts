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

        const query = getQuery(event)
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 50
        const skip = (page - 1) * limit

        // 1. Fetch Album details (without photos)
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
                // Photos are fetched separately for pagination
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

        // 2. Fetch Photos separately with pagination
        const photos = await prisma.photo.findMany({
            where: { albumId: id },
            select: {
                id: true,
                url: true,
                thumbnailUrl: true,
                filename: true,
                originalName: true,
                size: true,
                blurhash: true,
                dateTaken: true,
                createdAt: true,
                width: true,
                height: true,
                // EXIF data
                cameraModel: true,
                lens: true,
                focalLength: true,
                aperture: true,
                shutterSpeed: true,
                iso: true,
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
            skip,
            take: limit,
        })

        // Convert BigInt timestamps
        const mappedPhotos = photos.map((photo: any) => ({
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
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                photos: mappedPhotos,
                collaborators,
                permissions: {
                    isOwner,
                    isCollaborator,
                    canEdit: isOwner || isCollaborator,
                    canDelete: isOwner,
                },
                pagination: {
                    page,
                    limit,
                    total: album._count.photos,
                    hasMore: skip + photos.length < album._count.photos
                }
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
