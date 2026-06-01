import { eq, and, sql, count, inArray, desc, arrayOverlaps } from 'drizzle-orm'
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
            // Fetch group early so we can include theme/logo in the requiresPassword response
            const group = await db.query.shareGroups.findFirst({
                where: eq(shareGroups.id, shareLink.shareGroupId),
                with: { owner: { columns: { name: true } } },
            })
            if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

            const hasGroupCookieAccess = getCookie(event, `group-access-${shareLink.shareGroupId}`) === token
            const hasUserAdminAccess = authUser?.role === 'ADMIN'
            const hasGroupOwnerAccess = group.ownerId === authUser?.id

            if (shareLink.password && !hasGroupCookieAccess && !hasUserAdminAccess && !hasGroupOwnerAccess) {
                return {
                    success: true,
                    data: {
                        type: 'group',
                        requiresPassword: true,
                        showMetadata: shareLink.showMetadata,
                        themePreset: group.themePreset,
                        customTheme: group.customTheme,
                        logoText: group.logoText,
                        logoImageId: group.logoImageId,
                    },
                }
            }

            const groupAlbumRows = await resolveGroupAlbums(shareLink.shareGroupId, group)

            return {
                success: true,
                data: {
                    type: 'group',
                    groupId: group.id,
                    title: group.title,
                    description: group.description,
                    ownerName: group.owner.name,
                    requiresPassword: !!shareLink.password,
                    themePreset: group.themePreset,
                    customTheme: group.customTheme,
                    logoText: group.logoText,
                    logoImageId: group.logoImageId,
                    albums: groupAlbumRows,
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

async function resolveGroupAlbums(shareGroupId: string, group: { ownerId: string; tags: string[] }) {
    const [explicitRows, tagRows] = await Promise.all([
        db.select({ id: albums.id, title: albums.title, description: albums.description, eventDate: albums.eventDate, coverPhotoId: albums.coverPhotoId })
            .from(albums)
            .innerJoin(albumToShareGroups, and(eq(albumToShareGroups.B, shareGroupId), eq(albumToShareGroups.A, albums.id))),
        group.tags.length > 0
            ? db.select({ id: albums.id, title: albums.title, description: albums.description, eventDate: albums.eventDate, coverPhotoId: albums.coverPhotoId })
                .from(albums)
                .where(and(eq(albums.ownerId, group.ownerId), arrayOverlaps(albums.tags, group.tags)))
            : Promise.resolve([]),
    ])

    const seen = new Set<string>()
    const allRows = [...explicitRows, ...tagRows].filter(a => {
        if (seen.has(a.id)) return false
        seen.add(a.id)
        return true
    })

    if (allRows.length === 0) return []

    const albumIds = allRows.map(a => a.id)
    const coverIds = allRows.map(a => a.coverPhotoId).filter(Boolean) as string[]
    const noCoverIds = allRows.filter(a => !a.coverPhotoId).map(a => a.id)

    const [countRows, coverRows, fallbackRows] = await Promise.all([
        db.select({ albumId: photos.albumId, photoCount: count() })
            .from(photos)
            .where(inArray(photos.albumId, albumIds))
            .groupBy(photos.albumId),
        coverIds.length > 0
            ? db.select({ id: photos.id, blurhash: photos.blurhash })
                .from(photos)
                .where(inArray(photos.id, coverIds))
            : Promise.resolve([]),
        noCoverIds.length > 0
            ? db.selectDistinctOn([photos.albumId], { albumId: photos.albumId, id: photos.id, blurhash: photos.blurhash })
                .from(photos)
                .where(inArray(photos.albumId, noCoverIds))
                .orderBy(photos.albumId, desc(photos.createdAt))
            : Promise.resolve([]),
    ])

    const countMap = new Map(countRows.map(r => [r.albumId, r.photoCount]))
    const coverMap = new Map(coverRows.map(p => [p.id, p]))
    const fallbackMap = new Map(fallbackRows.map(p => [p.albumId!, { id: p.id, blurhash: p.blurhash }]))

    return allRows.map(album => ({
        id: album.id,
        name: album.title,
        description: album.description,
        eventDate: album.eventDate ? Number(album.eventDate) : null,
        photoCount: countMap.get(album.id) ?? 0,
        coverPhoto: album.coverPhotoId
            ? (coverMap.get(album.coverPhotoId) ?? null)
            : (fallbackMap.get(album.id) ?? null),
    }))
}
