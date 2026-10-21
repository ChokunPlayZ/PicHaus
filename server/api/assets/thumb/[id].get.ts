import { eq } from 'drizzle-orm'
import { photos, shareLinks } from '../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'
import { hasCommunityAlbumAccess } from '../../../utils/albums'
import { getImmutableAssetCacheControl, sendCachedAsset } from '../../../utils/asset-response'
import { getDirectAssetUrl, statStorageFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const now = getUnixTimestamp()

    const photo = await db.query.photos.findFirst({
        where: eq(photos.id, id!),
        with: { album: { with: { collaborators: true } } },
    })

    if (!photo) throw createError({ statusCode: 404, statusMessage: 'Photo not found' })

    let hasAccess = false
    if (photo.album.isPublic) {
        hasAccess = true
    } else {
        const authUserId = getAuthUserId(event)
        if (authUserId) {
            if (photo.album.ownerId === authUserId || await hasCommunityAlbumAccess(photo.album, authUserId)) {
                hasAccess = true
            } else {
                hasAccess = photo.album.collaborators.some(c => c.userId === authUserId)
            }
        }

        if (!hasAccess) {
            const shareToken = getCookie(event, `album-access-${photo.album.id}`)
            if (shareToken) {
                const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
                if (link && link.albumId === photo.album.id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasAccess = true
                }
            }
        }

        if (!hasAccess) {
            const cookies = parseCookies(event)
            for (const [key, groupToken] of Object.entries(cookies)) {
                if (!key.startsWith('group-access-')) continue
                const groupId = key.slice('group-access-'.length)
                const link = await db.query.shareLinks.findFirst({
                    where: eq(shareLinks.token, groupToken),
                    with: { shareGroup: { with: { albumMappings: { columns: { A: true } } } } },
                })
                if (
                    link &&
                    link.shareGroupId === groupId &&
                    (!link.expiresAt || link.expiresAt >= now) &&
                    link.shareGroup?.albumMappings.some(m => m.A === photo.album.id)
                ) {
                    hasAccess = true
                    break
                }
            }
        }
    }

    if (!hasAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    // Image requests carry the session in the URL, so preserve it when a
    // thumbnail is unavailable and the browser follows the full-size fallback.
    const accessToken = getQuery(event).access_token
    const fullUrl = `/api/assets/full/${id}${typeof accessToken === 'string' ? `?access_token=${encodeURIComponent(accessToken)}` : ''}`
    if (photo.album.isCommunity) setHeader(event, 'Cache-Control', 'private, no-store')
    if (!photo.thumbnailStoragePath) return sendRedirect(event, fullUrl)

    try {
        const metadata = await statStorageFile(photo.thumbnailStoragePath)
        const directUrl = getDirectAssetUrl(photo.thumbnailStoragePath)
        if (directUrl) return sendRedirect(event, directUrl, 302)

        return sendCachedAsset(event, {
            storagePath: photo.thumbnailStoragePath,
            metadata,
            contentType: 'image/webp',
            cacheControl: photo.album.isCommunity ? 'private, no-store' : getImmutableAssetCacheControl(photo.album.isPublic),
            lastModified: new Date(Number(photo.updatedAt || photo.createdAt) * 1000),
            etagSeed: `thumb:${photo.id}:${photo.updatedAt || photo.createdAt || ''}`,
        })
    } catch (error: any) {
        if (error?.statusCode) throw error
        return sendRedirect(event, fullUrl)
    }
})
