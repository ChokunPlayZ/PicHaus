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

        // Check if it's a group share
        if (shareLink.shareGroupId) {
            const group = await prisma.shareGroup.findUnique({
                where: { id: shareLink.shareGroupId },
                include: {
                    owner: {
                        select: {
                            name: true,
                        },
                    },
                    albums: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            eventDate: true,
                            _count: {
                                select: {
                                    photos: true,
                                },
                            },
                        },
                    },
                },
            })

            if (!group) {
                throw createError({
                    statusCode: 404,
                    statusMessage: 'Group not found',
                })
            }

            return {
                success: true,
                data: {
                    type: 'group',
                    groupId: group.id,
                    title: group.title,
                    description: group.description,
                    ownerName: group.owner.name,
                    requiresPassword: !!shareLink.password,
                    albums: group.albums.map(album => ({
                        id: album.id,
                        name: album.title,
                        description: album.description,
                        eventDate: album.eventDate ? Number(album.eventDate) : null,
                        photoCount: album._count.photos,
                    })),
                },
            }
        }

        if (!shareLink.album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found in this link',
            })
        }

        // It is an album share
        return {
            success: true,
            data: {
                type: 'album',
                albumId: shareLink.album.id,
                albumName: shareLink.album.title,
                description: shareLink.album.description,
                eventDate: shareLink.album.eventDate ? Number(shareLink.album.eventDate) : null,
                ownerName: shareLink.album.owner.name,
                photoCount: shareLink.album._count.photos,
                requiresPassword: !!shareLink.password,
                shareType: shareLink.type, // 'view' or 'upload' for albums
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
