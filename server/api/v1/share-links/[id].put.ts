import { eq, and, count, inArray } from 'drizzle-orm'
import { shareLinks, albums, shareGroups, albumToShareGroups } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.id, id),
        with: {
            album: { columns: { ownerId: true } },
            shareGroup: { columns: { ownerId: true } },
        },
    })

    if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

    const isOwner = (link.album?.ownerId === user.id) || (link.shareGroup?.ownerId === user.id)
    if (!isOwner && user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })

    const linkUpdateData: Partial<typeof shareLinks.$inferInsert> = {}
    if (body.label !== undefined) linkUpdateData.label = body.label
    if (body.showMetadata !== undefined) linkUpdateData.showMetadata = body.showMetadata
    if (body.uploadMessage !== undefined) linkUpdateData.uploadMessage = body.uploadMessage || null
    if (body.password) linkUpdateData.password = await argon2.hash(body.password)
    else if (body.removePassword) linkUpdateData.password = null

    if (Object.keys(linkUpdateData).length > 0) {
        await db.update(shareLinks).set(linkUpdateData).where(eq(shareLinks.id, id))
    }

    if (link.shareGroupId && body.isGroup) {
        const groupUpdateData: Partial<typeof shareGroups.$inferInsert> = {}
        if (body.groupTitle !== undefined) groupUpdateData.title = body.groupTitle
        if (body.groupDescription !== undefined) groupUpdateData.description = body.groupDescription
        if (body.groupTags !== undefined) groupUpdateData.tags = Array.isArray(body.groupTags) ? body.groupTags : []
        if (body.themePreset !== undefined) groupUpdateData.themePreset = body.themePreset || null
        if (body.customTheme !== undefined) groupUpdateData.customTheme = body.customTheme ? (typeof body.customTheme === 'string' ? body.customTheme : JSON.stringify(body.customTheme)) : null
        if (body.logoText !== undefined) groupUpdateData.logoText = body.logoText || null
        if (body.logoImageId !== undefined) groupUpdateData.logoImageId = body.logoImageId || null

        if (body.groupAlbumIds && Array.isArray(body.groupAlbumIds)) {
            const [{ value }] = await db.select({ value: count() })
                .from(albums)
                .where(and(inArray(albums.id, body.groupAlbumIds), eq(albums.ownerId, user.id)))

            if (value !== body.groupAlbumIds.length) {
                throw createError({ statusCode: 400, statusMessage: 'One or more albums invalid or not owned by you' })
            }

            await db.transaction(async (tx) => {
                await tx.delete(albumToShareGroups).where(eq(albumToShareGroups.B, link.shareGroupId!))
                if (body.groupAlbumIds.length > 0) {
                    await tx.insert(albumToShareGroups).values(
                        body.groupAlbumIds.map((aid: string) => ({ A: aid, B: link.shareGroupId! }))
                    )
                }
            })
        }

        if (Object.keys(groupUpdateData).length > 0) {
            await db.update(shareGroups).set(groupUpdateData).where(eq(shareGroups.id, link.shareGroupId))
        }
    }

    return { success: true, message: 'Share link updated' }
})
