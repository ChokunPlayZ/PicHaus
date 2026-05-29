import sharp from 'sharp'
import { eq, and, isNotNull } from 'drizzle-orm'
import { albums, shareLinks, shareGroups, albumToShareGroups, photos } from '../../../../db/schema'
import { getAbsoluteFilePath } from '../../../../utils/upload'
import justifiedLayout from 'justified-layout'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const now = getUnixTimestamp()

    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing album ID' })

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, id),
        with: {
            coverPhoto: { columns: { id: true, storagePath: true, thumbnailStoragePath: true } },
            collaborators: { columns: { userId: true } },
            owner: { columns: { id: true } },
        },
    })

    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

    if (!album.isPublic) {
        const authUserId = getAuthUserId(event)
        const isOwner = authUserId === album.owner.id
        const isCollaborator = !!authUserId && album.collaborators.some(c => c.userId === authUserId)

        let hasShareAccess = false
        const shareToken = getCookie(event, `album-access-${id}`)
        if (shareToken) {
            const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
            if (link && link.albumId === id && (!link.expiresAt || link.expiresAt >= now)) {
                hasShareAccess = true
            }
        }

        if (!hasShareAccess) {
            const groups = await db.select({ id: shareGroups.id })
                .from(shareGroups)
                .innerJoin(albumToShareGroups, and(eq(albumToShareGroups.B, shareGroups.id), eq(albumToShareGroups.A, id)))

            for (const group of groups) {
                const groupToken = getCookie(event, `group-access-${group.id}`)
                if (!groupToken) continue
                const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, groupToken) })
                if (link && link.shareGroupId === group.id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasShareAccess = true
                    break
                }
            }
        }

        if (!isOwner && !isCollaborator && !hasShareAccess) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }
    }

    const width = 1200
    const height = 630

    if (album.coverPhoto?.storagePath) {
        try {
            const fullPath = getAbsoluteFilePath(album.coverPhoto.storagePath)
            const imageBuffer = await sharp(fullPath).resize(width, height, { fit: 'cover', position: 'center' }).png().toBuffer()
            setHeaders(event, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' })
            return imageBuffer
        } catch {}
    }

    // Fallback collage
    let albumPhotos = await db.select({
        id: photos.id,
        width: photos.width,
        height: photos.height,
        storagePath: photos.storagePath,
        thumbnailStoragePath: photos.thumbnailStoragePath,
    })
        .from(photos)
        .where(and(eq(photos.albumId, id), isNotNull(photos.width), isNotNull(photos.height)))
        .limit(100)

    let composite = sharp({ create: { width, height, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
    const composites: sharp.OverlayOptions[] = []

    if (albumPhotos.length > 0) {
        for (let i = albumPhotos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [albumPhotos[i], albumPhotos[j]] = [albumPhotos[j], albumPhotos[i]]
        }
        const count = Math.min(albumPhotos.length, Math.floor(Math.random() * (32 - 16 + 1)) + 16)
        albumPhotos = albumPhotos.slice(0, count)

        const aspectRatios = albumPhotos.map(p => (p.width || 1) / (p.height || 1))
        const avgAspectRatio = aspectRatios.reduce((a, b) => a + b, 0) / aspectRatios.length
        const targetRowHeight = Math.sqrt((width * height * 1.2) / (albumPhotos.length * avgAspectRatio))

        const layout = justifiedLayout(aspectRatios, {
            targetRowHeight,
            containerWidth: width,
            boxSpacing: 10,
            containerPadding: 20,
            targetRowHeightTolerance: 0.2,
        })

        const results = await Promise.all(albumPhotos.map(async (photo, index) => {
            const box = (layout as any).boxes[index]
            if (!box || box.top > height) return null
            const path = photo.thumbnailStoragePath || photo.storagePath
            if (!path) return null
            try {
                const fullPath = getAbsoluteFilePath(path)
                const boxWidth = Math.round(box.width)
                const boxHeight = Math.round(box.height)
                const roundedCorners = Buffer.from(`<svg><rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" ry="10" /></svg>`)
                const imgBuffer = await sharp(fullPath)
                    .resize(boxWidth, boxHeight, { fit: 'cover' })
                    .composite([{ input: roundedCorners, blend: 'dest-in' }])
                    .toBuffer()
                return { input: imgBuffer, top: Math.round(box.top), left: Math.round(box.left) }
            } catch { return null }
        }))

        composites.push(...results.filter((c): c is sharp.OverlayOptions => c !== null))
    }

    const finalImage = await composite.composite(composites).png().toBuffer()
    setHeaders(event, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' })
    return finalImage
})
