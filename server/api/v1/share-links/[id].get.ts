import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID is required',
        })
    }

    // Fetch link with related data
    const link = await prisma.shareLink.findUnique({
        where: { id },
        include: {
            album: {
                select: {
                    id: true,
                    title: true,
                    ownerId: true
                }
            },
            shareGroup: {
                include: {
                    albums: {
                        select: {
                            id: true,
                            title: true,
                            // Minimal info
                        }
                    }
                }
            }
        }
    })

    if (!link) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Link not found',
        })
    }

    // Check ownership
    const albumOwnerId = link.album?.ownerId
    const groupOwnerId = link.shareGroup?.ownerId
    const isOwner = (albumOwnerId === user.id) || (groupOwnerId === user.id)

    if (!isOwner && user.role !== 'ADMIN') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Unauthorized',
        })
    }

    // Return detailed info for editing
    return {
        success: true,
        data: {
            id: link.id,
            label: link.label,
            token: link.token,
            hasPassword: !!link.password,
            type: link.type,
            showMetadata: link.showMetadata,

            // Group specific
            isGroup: !!link.shareGroupId,
            groupTitle: link.shareGroup?.title,
            groupDescription: link.shareGroup?.description,
            groupAlbumIds: link.shareGroup?.albums.map(a => a.id) || [],
            groupAlbums: link.shareGroup?.albums || [],

            // Album specific
            albumId: link.albumId,
            albumTitle: link.album?.title
        }
    }
})
