import prisma from '../../../utils/prisma'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

/**
 * Validate upload token and get album info
 */
export default defineEventHandler(async (event) => {
    try {
        const token = getRouterParam(event, 'token')
        const now = getUnixTimestamp()

        if (!token) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Upload token is required',
            })
        }

        const authUserId = getAuthUserId(event)

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
                        ownerId: true,
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

        if (shareLink.expiresAt && shareLink.expiresAt < now) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Link not found or expired',
            })
        }

        const authUser = authUserId
            ? await prisma.user.findUnique({
                where: { id: authUserId },
                select: { id: true, role: true }
            })
            : null

        // Check if it's a group share
        if (shareLink.shareGroupId) {
            const hasGroupCookieAccess = getCookie(event, `group-access-${shareLink.shareGroupId}`) === token
            const hasUserAdminAccess = authUser?.role === 'ADMIN'
            const hasGroupOwnerAccess = !!(authUser && await prisma.shareGroup.findFirst({
                where: {
                    id: shareLink.shareGroupId,
                    ownerId: authUser.id,
                },
                select: { id: true },
            }))

            if (shareLink.password && !hasGroupCookieAccess && !hasUserAdminAccess && !hasGroupOwnerAccess) {
                return {
                    success: true,
                    data: {
                        type: 'group',
                        requiresPassword: true,
                        showMetadata: shareLink.showMetadata,
                    },
                }
            }

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
                            photos: {
                                take: 1,
                                orderBy: {
                                    createdAt: 'desc'
                                },
                                select: {
                                    id: true,
                                    blurhash: true
                                }
                            }
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
                        coverPhoto: album.photos[0] ? {
                            id: album.photos[0].id,
                            blurhash: album.photos[0].blurhash
                        } : null
                    })),
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        if (!shareLink.album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found in this link',
            })
        }

        const hasAlbumCookieAccess = !!shareLink.albumId && getCookie(event, `album-access-${shareLink.albumId}`) === token
        const hasUserAdminAccess = authUser?.role === 'ADMIN'
        const hasAlbumOwnerAccess = !!(authUser && shareLink.album.ownerId === authUser.id)
        const hasAlbumCollaboratorAccess = !!(authUser && await prisma.albumCollaborator.findFirst({
            where: {
                albumId: shareLink.album.id,
                userId: authUser.id,
            },
            select: { id: true },
        }))

        if (
            shareLink.password &&
            !hasAlbumCookieAccess &&
            !hasUserAdminAccess &&
            !hasAlbumOwnerAccess &&
            !hasAlbumCollaboratorAccess
        ) {
            return {
                success: true,
                data: {
                    type: 'album',
                    requiresPassword: true,
                    shareType: shareLink.type,
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        // It is an album share (view or upload)
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
                showMetadata: shareLink.showMetadata,
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
