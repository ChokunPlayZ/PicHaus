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
                                instagram: true,
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
        let hasShareLinkAccess = false

        // Check for share link access (guest with share link)
        if (!album.isPublic && !isOwner && !isCollaborator) {
            const shareToken = getCookie(event, `album-access-${id}`)
            if (shareToken) {
                const link = await prisma.shareLink.findUnique({
                    where: { token: shareToken }
                })
                if (link && link.albumId === id) {
                    hasShareLinkAccess = true
                }
            }

            // Check for group access
            if (!hasShareLinkAccess) {
                const groups = await prisma.shareGroup.findMany({
                    where: { albums: { some: { id } } },
                    select: { id: true }
                })

                for (const group of groups) {
                    const groupToken = getCookie(event, `group-access-${group.id}`)
                    if (groupToken) {
                        const link = await prisma.shareLink.findUnique({
                            where: { token: groupToken }
                        })
                        if (link && link.shareGroupId === group.id) {
                            hasShareLinkAccess = true
                            break
                        }
                    }
                }
            }
        }

        const canView = album.isPublic || isOwner || isCollaborator || hasShareLinkAccess

        if (!canView) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have permission to view this album',
            })
        }

        // Extract filter parameters
        const camera = query.camera as string | undefined
        const lens = query.lens as string | undefined
        const photographer = query.photographer as string | undefined

        // Build where clause with filters
        const whereClause: any = { albumId: id }

        if (camera) {
            whereClause.cameraModel = { contains: camera, mode: 'insensitive' }
        }
        if (lens) {
            whereClause.lens = { contains: lens, mode: 'insensitive' }
        }
        if (photographer) {
            whereClause.uploaderId = photographer
        }

        // 2. Fetch Photos separately with pagination and filters
        const photos = await prisma.photo.findMany({
            where: whereClause,
            select: {
                id: true,
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
                        instagram: true,
                    },
                },
            },
            orderBy: [
                { dateTaken: 'desc' },
                { createdAt: 'desc' }
            ],
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
