import { eq, and, sql } from 'drizzle-orm'
import { shareLinks, shareGroups, albumCollaborators, albums, photos, users, albumToShareGroups } from '../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const token = getRouterParam(event, 'token')
        const now = getUnixTimestamp()
        if (!token) throw createError({ statusCode: 400, statusMessage: 'Upload token is required' })

        const authUserId = getAuthUserId(event)

        const shareLink = await db.query.shareLinks.findFirst({
            where: eq(shareLinks.token, token),
            with: {
                album: {
                    with: { owner: { columns: { name: true } } },
                    columns: { id: true, title: true, description: true, eventDate: true, ownerId: true, themePreset: true, customTheme: true, logoText: true, logoImageId: true },
                },
            },
        })

        if (!shareLink) throw createError({ statusCode: 404, statusMessage: 'Link not found or expired' })
        if (shareLink.expiresAt && shareLink.expiresAt < now) throw createError({ statusCode: 404, statusMessage: 'Link not found or expired' })

        const authUser = authUserId
            ? await db.query.users.findFirst({ where: eq(users.id, authUserId), columns: { id: true, role: true } }) ?? null
            : null

        if (shareLink.shareGroupId) {
            const hasGroupCookieAccess = getCookie(event, `group-access-${shareLink.shareGroupId}`) === token
            const hasUserAdminAccess = authUser?.role === 'ADMIN'
            const hasGroupOwnerAccess = !!(authUser && await db.query.shareGroups.findFirst({
                where: and(eq(shareGroups.id, shareLink.shareGroupId), eq(shareGroups.ownerId, authUser.id)),
                columns: { id: true },
            }))

            if (shareLink.password && !hasGroupCookieAccess && !hasUserAdminAccess && !hasGroupOwnerAccess) {
                return { success: true, data: { type: 'group', requiresPassword: true, showMetadata: shareLink.showMetadata } }
            }

            const group = await db.query.shareGroups.findFirst({
                where: eq(shareGroups.id, shareLink.shareGroupId),
                with: { owner: { columns: { name: true } } },
            })
            if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

            const groupAlbumRows = await db.select({
                id: albums.id,
                title: albums.title,
                description: albums.description,
                eventDate: albums.eventDate,
                photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."albumId" = ${albums.id})`,
                latestPhotoId: sql<string | null>`(SELECT id FROM photos WHERE photos."albumId" = ${albums.id} ORDER BY "createdAt" DESC LIMIT 1)`,
                latestPhotoBlurhash: sql<string | null>`(SELECT blurhash FROM photos WHERE photos."albumId" = ${albums.id} ORDER BY "createdAt" DESC LIMIT 1)`,
            })
                .from(albums)
                .innerJoin(albumToShareGroups, and(
                    eq(albumToShareGroups.B, shareLink.shareGroupId),
                    eq(albumToShareGroups.A, albums.id),
                ))

            return {
                success: true,
                data: {
                    type: 'group',
                    groupId: group.id,
                    title: group.title,
                    description: group.description,
                    ownerName: group.owner.name,
                    requiresPassword: !!shareLink.password,
                    albums: groupAlbumRows.map(album => ({
                        id: album.id,
                        name: album.title,
                        description: album.description,
                        eventDate: album.eventDate ? Number(album.eventDate) : null,
                        photoCount: Number(album.photoCount),
                        coverPhoto: album.latestPhotoId ? { id: album.latestPhotoId, blurhash: album.latestPhotoBlurhash ?? '' } : null,
                    })),
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        if (!shareLink.album) throw createError({ statusCode: 404, statusMessage: 'Album not found in this link' })

        const hasAlbumCookieAccess = !!shareLink.albumId && getCookie(event, `album-access-${shareLink.albumId}`) === token
        const hasUserAdminAccess = authUser?.role === 'ADMIN'
        const hasAlbumOwnerAccess = !!(authUser && shareLink.album.ownerId === authUser.id)
        const hasAlbumCollaboratorAccess = !!(authUser && await db.query.albumCollaborators.findFirst({
            where: and(eq(albumCollaborators.albumId, shareLink.album.id), eq(albumCollaborators.userId, authUser.id)),
            columns: { id: true },
        }))

        if (shareLink.password && !hasAlbumCookieAccess && !hasUserAdminAccess && !hasAlbumOwnerAccess && !hasAlbumCollaboratorAccess) {
            return { success: true, data: { type: 'album', requiresPassword: true, shareType: shareLink.type, showMetadata: shareLink.showMetadata } }
        }

        const [{ photoCount }] = await db.select({ photoCount: sql<number>`COUNT(*)` })
            .from(photos)
            .where(eq(photos.albumId, shareLink.album.id))

        return {
            success: true,
            data: {
                type: 'album',
                albumId: shareLink.album.id,
                albumName: shareLink.album.title,
                description: shareLink.album.description,
                eventDate: shareLink.album.eventDate ? Number(shareLink.album.eventDate) : null,
                ownerName: shareLink.album.owner.name,
                photoCount: Number(photoCount),
                requiresPassword: !!shareLink.password,
                shareType: shareLink.type,
                showMetadata: shareLink.showMetadata,
                themePreset: shareLink.album.themePreset,
                customTheme: shareLink.album.customTheme,
                logoText: shareLink.album.logoText,
                logoImageId: shareLink.album.logoImageId,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to validate upload link' })
    }
})
