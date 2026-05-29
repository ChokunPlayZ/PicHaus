import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { eq } from 'drizzle-orm'
import { photos, shareLinks } from '../../../db/schema'
import { getAbsoluteFilePath } from '../../../utils/upload'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

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
            if (photo.album.ownerId === authUserId) {
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
    if (!photo.storagePath) throw createError({ statusCode: 404, statusMessage: 'File path not found' })

    const filePath = getAbsoluteFilePath(photo.storagePath)

    try {
        const stats = await stat(filePath)

        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'image/avif', 'image/heif', 'image/heic'])
        const safeMimeType = allowedMimeTypes.has(photo.mimeType) ? photo.mimeType : 'application/octet-stream'

        setHeader(event, 'Content-Type', safeMimeType)
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Length', stats.size)
        setHeader(event, 'Cache-Control', photo.album.isPublic ? 'public, max-age=31536000, immutable' : 'private, max-age=3600')

        return sendStream(event, createReadStream(filePath))
    } catch {
        throw createError({ statusCode: 404, statusMessage: 'File not found on server' })
    }
})
