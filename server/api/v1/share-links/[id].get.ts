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
                columns: { id: true, title: true, description: true, ownerId: true, tags: true, themePreset: true, customTheme: true, logoText: true, logoImageId: true },
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
            groupTags: link.shareGroup?.tags ?? [],
            groupThemePreset: link.shareGroup?.themePreset ?? '',
            groupCustomTheme: link.shareGroup?.customTheme ?? '',
            groupLogoText: link.shareGroup?.logoText ?? '',
            groupLogoImageId: link.shareGroup?.logoImageId ?? '',
            groupAlbumIds: groupAlbums.map(a => a.id),
            groupAlbums,
            albumId: link.albumId,
            albumTitle: link.album?.title,
        },
    }
})
