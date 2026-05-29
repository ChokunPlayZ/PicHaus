import { eq, or, desc } from 'drizzle-orm'
import { shareLinks, albums, shareGroups } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const rows = await db.select({
        id: shareLinks.id,
        token: shareLinks.token,
        type: shareLinks.type,
        label: shareLinks.label,
        views: shareLinks.views,
        createdAt: shareLinks.createdAt,
        expiresAt: shareLinks.expiresAt,
        password: shareLinks.password,
        showMetadata: shareLinks.showMetadata,
        albumId: shareLinks.albumId,
        albumTitle: albums.title,
        albumOwnerId: albums.ownerId,
        shareGroupId: shareLinks.shareGroupId,
        shareGroupTitle: shareGroups.title,
        shareGroupOwnerId: shareGroups.ownerId,
    })
        .from(shareLinks)
        .leftJoin(albums, eq(shareLinks.albumId, albums.id))
        .leftJoin(shareGroups, eq(shareLinks.shareGroupId, shareGroups.id))
        .where(or(eq(albums.ownerId, user.id), eq(shareGroups.ownerId, user.id)))
        .orderBy(desc(shareLinks.createdAt))

    return {
        success: true,
        data: rows.map(link => {
            const isGroup = !!link.shareGroupId
            const targetName = isGroup ? link.shareGroupTitle : link.albumTitle
            const url = !isGroup && link.type === 'upload' ? `/u/${link.token}` : `/v/${link.token}`
            return {
                id: link.id,
                token: link.token,
                type: link.type,
                targetType: isGroup ? 'Group' : 'Album',
                targetName: targetName || 'Unknown',
                label: link.label,
                views: link.views,
                createdAt: link.createdAt ? Number(link.createdAt) : null,
                expiresAt: link.expiresAt ? Number(link.expiresAt) : null,
                hasPassword: !!link.password,
                showMetadata: link.showMetadata,
                url,
            }
        }),
    }
})
