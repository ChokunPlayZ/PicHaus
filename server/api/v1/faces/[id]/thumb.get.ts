import { Readable } from 'stream'
import sharp from 'sharp'
import { eq } from 'drizzle-orm'
import { faces, shareLinks } from '../../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'
import { readStorageFile } from '../../../../utils/storage'

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Face ID is required' })

        const face = await db.query.faces.findFirst({
            where: eq(faces.id, id),
            with: { photo: { with: { album: { with: { collaborators: true } } } } },
        })
        if (!face?.photo?.storagePath) {
            throw createError({ statusCode: 404, statusMessage: 'Face not found' })
        }

        const now = getUnixTimestamp()
        const photo = face.photo
        const album = photo.album

        let hasAccess = false
        if (album.isPublic) {
            hasAccess = true
        } else {
            const authUserId = getAuthUserId(event)
            if (authUserId) {
                if (album.ownerId === authUserId) {
                    hasAccess = true
                } else {
                    hasAccess = album.collaborators.some(c => c.userId === authUserId)
                }
            }

            if (!hasAccess) {
                const shareToken = getCookie(event, `album-access-${album.id}`)
                if (shareToken) {
                    const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
                    if (link && link.albumId === album.id && (!link.expiresAt || link.expiresAt >= now)) {
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
                        link.shareGroup?.albumMappings.some(m => m.A === album.id)
                    ) {
                        hasAccess = true
                        break
                    }
                }
            }
        }

        if (!hasAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

        const imageBuffer = await readStorageFile(photo.storagePath)

        // Expand the face box outward by PAD on each side so the thumbnail has
        // some headroom around the face (a tight crop looks weird).
        const PAD = 0.35
        const faceW = Math.max((face.x2 - face.x1) * photo.width, 1)
        const faceH = Math.max((face.y2 - face.y1) * photo.height, 1)
        const centerX = (face.x1 + face.x2) / 2 * photo.width
        const centerY = (face.y1 + face.y2) / 2 * photo.height

        const left = clamp(Math.round(centerX - faceW * (0.5 + PAD)), 0, Math.max(photo.width - 1, 0))
        const top = clamp(Math.round(centerY - faceH * (0.5 + PAD)), 0, Math.max(photo.height - 1, 0))
        const right = clamp(Math.round(centerX + faceW * (0.5 + PAD)), left + 1, Math.max(photo.width, 1))
        const bottom = clamp(Math.round(centerY + faceH * (0.5 + PAD)), top + 1, Math.max(photo.height, 1))

        const thumbBuffer = await sharp(imageBuffer)
            .rotate()
            .extract({
                left,
                top,
                width: right - left,
                height: bottom - top,
            })
            .resize(128, 128, { fit: 'cover' })
            .webp({ quality: 80 })
            .toBuffer()

        setHeader(event, 'Content-Type', 'image/webp')
        setHeader(event, 'Cache-Control', 'private, max-age=3600')
        setHeader(event, 'Content-Length', thumbBuffer.length)
        return sendStream(event, Readable.from([thumbBuffer]))
    } catch (error: any) {
        if (error?.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to generate face thumbnail' })
    }
})
