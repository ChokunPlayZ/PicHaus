import prisma from '../../../utils/prisma'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

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
        const authUserId = getAuthUserId(event)
        const now = getUnixTimestamp()

        const query = getQuery(event)
        const page = Math.max(1, Number(query.page) || 1)
        const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
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
                coverPhoto: {
                    select: {
                        id: true,
                        blurhash: true,
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
        const isOwner = authUserId === album.ownerId
        const collaborator = album.collaborators.find((c: any) => c.userId === authUserId)
        const isCollaborator = !!collaborator
        const canEditAsCollaborator = !!collaborator && collaborator.role !== 'viewer'
        let hasShareLinkAccess = false

        // Check for share link access (guest with share link)
        if (!album.isPublic && !isOwner && !isCollaborator) {
            const shareToken = getCookie(event, `album-access-${id}`)
            if (shareToken) {
                const link = await prisma.shareLink.findUnique({
                    where: { token: shareToken }
                })
                if (link && link.albumId === id && (!link.expiresAt || link.expiresAt >= now)) {
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
                        if (link && link.shareGroupId === group.id && (!link.expiresAt || link.expiresAt >= now)) {
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

        // Handle cover photo fallback if not explicitly set
        let coverPhoto = album.coverPhoto
        if (!coverPhoto) {
            const fallbackCover = await prisma.$queryRaw`
                SELECT id, blurhash 
                FROM photos 
                WHERE "albumId" = ${id}::uuid
                ORDER BY 
                    CASE WHEN width >= height THEN 1 ELSE 0 END DESC,
                    "createdAt" DESC
                LIMIT 1
            ` as any[]

            if (fallbackCover.length > 0) {
                coverPhoto = fallbackCover[0]
            }
        }

        return {
            success: true,
            data: {
                ...album,
                coverPhoto,
                name: album.title, // Map title to name for frontend
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                photos: mappedPhotos,
                collaborators,
                permissions: {
                    isOwner,
                    isCollaborator,
                    canEdit: isOwner || canEditAsCollaborator,
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
