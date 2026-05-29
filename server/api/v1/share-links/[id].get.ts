import { eq } from 'drizzle-orm'
import { shareLinks } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.id, id),
        with: {
            album: { columns: { id: true, title: true, ownerId: true } },
            shareGroup: {
                with: { albumMappings: { with: { album: { columns: { id: true, title: true } } } } },
            },
        },
    })

    if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

    const albumOwnerId = link.album?.ownerId
    const groupOwnerId = link.shareGroup?.ownerId
    const isOwner = (albumOwnerId === user.id) || (groupOwnerId === user.id)
    if (!isOwner && user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })

    const groupAlbums = link.shareGroup?.albumMappings.map(m => m.album) ?? []

    return {
        success: true,
        data: {
            id: link.id,
            label: link.label,
            token: link.token,
            hasPassword: !!link.password,
            type: link.type,
            showMetadata: link.showMetadata,
            isGroup: !!link.shareGroupId,
            groupTitle: link.shareGroup?.title,
            groupDescription: link.shareGroup?.description,
            groupAlbumIds: groupAlbums.map(a => a.id),
            groupAlbums,
            albumId: link.albumId,
            albumTitle: link.album?.title,
        },
    }
})
