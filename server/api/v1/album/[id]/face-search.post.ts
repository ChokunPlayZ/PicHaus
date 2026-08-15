import { eq, and, inArray } from 'drizzle-orm'
import sharp from 'sharp'
import { albums, photos, users, faces, shareLinks, shareGroups, albumToShareGroups } from '../../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'
import {
    detectFaces,
    type DetectedFace,
    MachineLearningRequestError,
    MachineLearningUnavailableError,
} from '../../../../utils/machine-learning'
import {
    matchReferenceFaces,
    type FaceSearchCandidate,
    type FaceSearchPhoto,
    type ReferenceFaceInput,
} from '../../../../utils/face-search'
import { enforceRateLimit } from '../../../../utils/rate-limit'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

type AlbumAccess = 'public' | 'auth' | 'link' | 'none'

// Mirrors the access rules used by the album and asset endpoints: public
// albums, owners/collaborators, and share-link cookies (album or group).
// Access granted through a share link additionally requires the link's own
// face-search toggle so link owners can opt out.
async function canAccessAlbum(event: any, albumId: string): Promise<AlbumAccess> {
    const now = getUnixTimestamp()

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, albumId),
        columns: { id: true, isPublic: true, ownerId: true },
        with: { collaborators: { columns: { userId: true } } },
    })
    if (!album) return 'none'
    if (album.isPublic) return 'public'

    const authUserId = getAuthUserId(event)
    if (authUserId && (authUserId === album.ownerId || album.collaborators.some(c => c.userId === authUserId))) {
        return 'auth'
    }

    const shareToken = getCookie(event, `album-access-${album.id}`)
    if (shareToken) {
        const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
        if (link && link.albumId === album.id && (!link.expiresAt || link.expiresAt >= now)) {
            return link.faceSearchEnabled ? 'link' : 'none'
        }
    }

    const groups = await db.select({ id: shareGroups.id })
        .from(shareGroups)
        .innerJoin(albumToShareGroups, and(
            eq(albumToShareGroups.B, shareGroups.id),
            eq(albumToShareGroups.A, album.id),
        ))

    for (const group of groups) {
        const groupToken = getCookie(event, `group-access-${group.id}`)
        if (!groupToken) continue
        const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, groupToken) })
        if (link && link.shareGroupId === group.id && (!link.expiresAt || link.expiresAt >= now)) {
            return link.faceSearchEnabled ? 'link' : 'none'
        }
    }

    return 'none'
}

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

    enforceRateLimit(event, { key: 'face-search', limit: 10, windowMs: 60 * 60 * 1000 })

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No file provided' })
    }

    const imagePart = formData.find(part => part.name === 'image')
    if (!imagePart?.data || imagePart.data.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No image provided' })
    }
    if (imagePart.data.length > MAX_UPLOAD_BYTES) {
        throw createError({ statusCode: 413, statusMessage: 'Image is too large. Maximum size is 25 MB.' })
    }

    const mimeType = imagePart.type || ''
    if (!ALLOWED_TYPES.has(mimeType)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid file type. Use JPEG, PNG, or WebP.' })
    }

    // Search scope defaults to the album in the URL; a share group passes the
    // comma-separated ids of every album it contains via the `albums` query.
    const query = getQuery(event)
    const requestedIds = typeof query.albums === 'string'
        ? query.albums.split(',').map(value => value.trim()).filter(Boolean)
        : []
    const albumIds = requestedIds.length > 0 ? [...new Set(requestedIds)] : [id]

    const accessibleAlbumIds: string[] = []
    for (const albumId of albumIds) {
        const access = await canAccessAlbum(event, albumId)
        if (access !== 'none') accessibleAlbumIds.push(albumId)
    }
    if (accessibleAlbumIds.length === 0) {
        throw createError({ statusCode: 403, statusMessage: 'You do not have permission to view this album' })
    }

    // Normalize the uploaded photo to JPEG so the ML service always receives
    // the same format, and use the converted buffer's dimensions for boxes.
    let jpegBuffer: Buffer
    try {
        jpegBuffer = await sharp(imagePart.data)
            .rotate()
            .jpeg({ quality: 92 })
            .toBuffer()
    } catch {
        throw createError({ statusCode: 422, statusMessage: 'Could not read the uploaded photo' })
    }

    const metadata = await sharp(jpegBuffer).metadata()
    const imageWidth = metadata.width || 0
    const imageHeight = metadata.height || 0
    if (imageWidth <= 0 || imageHeight <= 0) {
        throw createError({ statusCode: 422, statusMessage: 'Could not read the uploaded photo' })
    }

    let detectedFaces: DetectedFace[]
    try {
        detectedFaces = await detectFaces(jpegBuffer)
    } catch (error) {
        if (error instanceof MachineLearningUnavailableError) {
            throw createError({
                statusCode: 503,
                statusMessage: 'Face search is temporarily unavailable. Please try again later.',
            })
        }
        if (error instanceof MachineLearningRequestError) {
            throw createError({ statusCode: 422, statusMessage: 'Could not read the uploaded photo' })
        }
        throw error
    }

    if (detectedFaces.length === 0) {
        return { success: true, data: { faces: [] } }
    }

    const faceRows = await db.select({
        faceId: faces.id,
        personId: faces.personId,
        embedding: faces.embedding,
        photoId: photos.id,
        filename: photos.filename,
        originalName: photos.originalName,
        size: photos.size,
        blurhash: photos.blurhash,
        width: photos.width,
        height: photos.height,
        dateTaken: photos.dateTaken,
        createdAt: photos.createdAt,
        updatedAt: photos.updatedAt,
        uploaderId: users.id,
        uploaderName: users.name,
        uploaderInstagram: users.instagram,
        uploaderAvatarPath: users.avatarPath,
    })
        .from(faces)
        .innerJoin(photos, eq(faces.photoId, photos.id))
        .leftJoin(users, eq(photos.uploaderId, users.id))
        .where(inArray(photos.albumId, accessibleAlbumIds))

    const candidates: FaceSearchCandidate[] = faceRows.map(row => ({
        faceId: row.faceId,
        photoId: row.photoId,
        embedding: row.embedding,
        photo: {
            id: row.photoId,
            filename: row.filename,
            originalName: row.originalName,
            size: row.size,
            blurhash: row.blurhash,
            width: row.width,
            height: row.height,
            dateTaken: row.dateTaken ? Number(row.dateTaken) : null,
            createdAt: Number(row.createdAt),
            updatedAt: row.updatedAt ? Number(row.updatedAt) : null,
            uploader: row.uploaderId ? {
                id: row.uploaderId,
                name: row.uploaderName,
                instagram: row.uploaderInstagram,
                avatar: row.uploaderAvatarPath ? `/api/assets/avatar/${row.uploaderId}` : null,
            } : null,
        } satisfies FaceSearchPhoto,
    }))

    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.5')
    const referenceFaces: ReferenceFaceInput[] = detectedFaces.map(face => ({
        box: {
            x1: clamp(face.boundingBox.x1 / imageWidth, 0, 1),
            y1: clamp(face.boundingBox.y1 / imageHeight, 0, 1),
            x2: clamp(face.boundingBox.x2 / imageWidth, 0, 1),
            y2: clamp(face.boundingBox.y2 / imageHeight, 0, 1),
        },
        score: face.score,
        embedding: face.embedding,
    }))

    const groups = matchReferenceFaces(
        referenceFaces,
        candidates,
        { threshold },
    )

    return {
        success: true,
        data: {
            faces: groups,
        },
    }
})
