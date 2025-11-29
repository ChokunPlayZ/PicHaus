import prisma from '../../../utils/prisma'

/**
 * Validate upload token and get album info
 */
export default defineEventHandler(async (event) => {
    try {
        const token = getRouterParam(event, 'token')

        if (!token) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Upload token is required',
            })
        }

        // Find share link
        const shareLink = await prisma.shareLink.findUnique({
            where: { token },
            include: {
                album: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        eventDate: true,
                        owner: {
                            select: {
                                name: true,
                            },
                        },
                        _count: {
                            select: {
                                photos: true,
                            },
                        },
                    },
                },
            },
        })

        if (!shareLink) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Link not found or expired',
            })
        }

        // Check if it's an upload link (if this endpoint is strictly for upload page)
        // The user said "link can be view and upload".
        // If this is for the upload page, maybe we only allow upload links?
        // But maybe we want to show the album info regardless.
        // Let's return the type so frontend can decide.

        let photos: any[] = []
        let pagination: any = null

        if (!shareLink.password) {
            const query = getQuery(event)
            const page = Number(query.page) || 1
            const limit = Number(query.limit) || 50
            const skip = (page - 1) * limit

            const [fetchedPhotos, total] = await Promise.all([
                prisma.photo.findMany({
                    where: { albumId: shareLink.album.id },
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
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.photo.count({ where: { albumId: shareLink.album.id } })
            ])

            photos = fetchedPhotos.map((photo: any) => ({
                ...photo,
                dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
                createdAt: Number(photo.createdAt),
            }))

            pagination = {
                page,
                limit,
                total,
                hasMore: skip + fetchedPhotos.length < total
            }
        }

        return {
            success: true,
            data: {
                albumId: shareLink.album.id,
                albumName: shareLink.album.title,
                description: shareLink.album.description,
                eventDate: shareLink.album.eventDate ? Number(shareLink.album.eventDate) : null,
                ownerName: shareLink.album.owner.name,
                photoCount: shareLink.album._count.photos,
                requiresPassword: !!shareLink.password,
                type: shareLink.type,
                photos,
                pagination,
            },
        }
    } catch (error: any) {
        console.error('Error validating upload token:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to validate upload link',
        })
    }
})
