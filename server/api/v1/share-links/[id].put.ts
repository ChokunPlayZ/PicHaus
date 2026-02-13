import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID is required',
        })
    }

    const link = await prisma.shareLink.findUnique({
        where: { id },
        include: {
            album: { select: { ownerId: true } },
            shareGroup: { select: { ownerId: true } }
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

    const linkUpdateData: any = {}
    if (body.label !== undefined) linkUpdateData.label = body.label
    if (body.showMetadata !== undefined) linkUpdateData.showMetadata = body.showMetadata

    // Password update
    if (body.password) {
        linkUpdateData.password = await argon2.hash(body.password)
    } else if (body.removePassword) {
        linkUpdateData.password = null
    }

    // Update Link
    if (Object.keys(linkUpdateData).length > 0) {
        await prisma.shareLink.update({
            where: { id },
            data: linkUpdateData
        })
    }

    // Handle Group Updates
    if (link.shareGroupId && body.isGroup) {
        const groupUpdateData: any = {}
        if (body.groupTitle !== undefined) groupUpdateData.title = body.groupTitle
        if (body.groupDescription !== undefined) groupUpdateData.description = body.groupDescription

        // Update Albums in Group
        if (body.groupAlbumIds && Array.isArray(body.groupAlbumIds)) {
            // Validate all albums belong to user? Ideally yes.
            // But strict FK constraints might prevent adding others' albums anyway if not connected correctly?
            // Actually, we should verify ownership of these albums.
            const userAlbums = await prisma.album.count({
                where: {
                    id: { in: body.groupAlbumIds },
                    ownerId: user.id
                }
            })

            if (userAlbums !== body.groupAlbumIds.length) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'One or more albums invalid or not owned by you',
                })
            }

            groupUpdateData.albums = {
                set: body.groupAlbumIds.map((aid: string) => ({ id: aid }))
            }
        }

        if (Object.keys(groupUpdateData).length > 0) {
            await prisma.shareGroup.update({
                where: { id: link.shareGroupId },
                data: groupUpdateData
            })
        }
    }

    return {
        success: true,
        message: 'Share link updated'
    }
})
