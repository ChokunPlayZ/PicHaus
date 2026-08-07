import sharp from 'sharp'
import justifiedLayout from 'justified-layout'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { albums, albumToShareGroups, photos, shareGroups, shareLinks } from '../../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'
import { readStorageFile } from '../../../../utils/storage'

const STORY_WIDTH = 1440
const STORY_HEIGHT = 2560
const STORY_PHOTO_COUNT = 27
const STORY_GAP = 8

function pickLayout(aspectRatios: number[]) {
    let low = 80
    let high = 520
    let best: any = null

    for (let i = 0; i < 18; i++) {
        const targetRowHeight = (low + high) / 2
        const layout = justifiedLayout(aspectRatios, {
            targetRowHeight,
            containerWidth: STORY_WIDTH,
            boxSpacing: STORY_GAP,
            containerPadding: 0,
            targetRowHeightTolerance: 0.18,
        }) as any

        if (layout.containerHeight <= STORY_HEIGHT) {
            best = layout
            low = targetRowHeight
        } else {
            high = targetRowHeight
        }
    }

    return best ?? justifiedLayout(aspectRatios, {
        targetRowHeight: low,
        containerWidth: STORY_WIDTH,
        boxSpacing: STORY_GAP,
        containerPadding: 0,
        targetRowHeightTolerance: 0.18,
    }) as any
}

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing album ID' })

    const authUserId = getAuthUserId(event)
    const now = getUnixTimestamp()

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, id),
        with: {
            collaborators: { columns: { userId: true } },
            owner: { columns: { id: true } },
        },
    })

    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

    const isOwner = authUserId === album.owner.id
    const isCollaborator = !!authUserId && album.collaborators.some(c => c.userId === authUserId)
    let hasShareAccess = false

    if (!album.isPublic && !isOwner && !isCollaborator) {
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
    }

    if (!album.isPublic && !isOwner && !isCollaborator && !hasShareAccess) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const albumPhotos = await db.select({
        id: photos.id,
        width: photos.width,
        height: photos.height,
        storagePath: photos.storagePath,
    })
        .from(photos)
        .where(and(
            eq(photos.albumId, id),
            isNotNull(photos.storagePath),
            isNotNull(photos.width),
            isNotNull(photos.height),
        ))
        .orderBy(sql`random()`)
        .limit(STORY_PHOTO_COUNT)

    if (albumPhotos.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'No photos found' })
    }

    const aspectRatios = albumPhotos.map(photo => Math.max(0.1, (photo.width || 1) / (photo.height || 1)))
    const layout = pickLayout(aspectRatios)
    const topOffset = Math.max(0, Math.round((STORY_HEIGHT - layout.containerHeight) / 2))
    const background = { r: 15, g: 15, b: 16, alpha: 1 }
    const composites = await Promise.all(albumPhotos.map(async (photo, index): Promise<sharp.OverlayOptions | null> => {
        const box = layout.boxes[index]
        if (!box || !photo.storagePath) return null

        try {
            const boxWidth = Math.max(1, Math.round(box.width))
            const boxHeight = Math.max(1, Math.round(box.height))
            const sourceBuffer = await readStorageFile(photo.storagePath)
            const imageBuffer = await sharp(sourceBuffer)
                .rotate()
                .resize(boxWidth, boxHeight, {
                    fit: 'contain',
                    background,
                })
                .jpeg({ quality: 88, mozjpeg: true })
                .toBuffer()

            return {
                input: imageBuffer,
                left: Math.round(box.left),
                top: Math.round(box.top) + topOffset,
            }
        } catch {
            return null
        }
    }))

    const finalImage = await sharp({
        create: {
            width: STORY_WIDTH,
            height: STORY_HEIGHT,
            channels: 4,
            background,
        },
    })
        .composite(composites.filter((item): item is sharp.OverlayOptions => item !== null))
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer()

    setHeaders(event, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${album.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'album'}-instagram-story.jpg"`,
    })

    return finalImage
})
