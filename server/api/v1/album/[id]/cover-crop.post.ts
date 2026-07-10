import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'
import sharp from 'sharp'
import { saveFile, generateBlurhash, deleteFile, calculateFileHash, generateThumbnail } from '../../../../utils/upload'
import { readStorageFile } from '../../../../utils/storage'
import crypto from 'crypto'

const COVER_MAX_DIMENSION = 1920
const COVER_JPEG_QUALITY = 85

export default defineEventHandler(async (event) => {
    let coverPath: string | null = null
    let thumbnailPath: string | null = null

    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
            with: { collaborators: { where: and(eq(albumCollaborators.userId, user.id), inArray(albumCollaborators.role, ['admin', 'editor'])) } },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        if (album.ownerId !== user.id) {
            throw createError({ statusCode: 403, statusMessage: 'Only the album owner can edit this album' })
        }
        if (!user.email) {
            throw createError({ statusCode: 403, statusMessage: 'Guest users cannot edit albums until they have an email assigned' })
        }

        const contentType = getHeader(event, 'content-type') || ''
        let processedBuffer: Buffer

        if (contentType.includes('application/json')) {
            const body = await readBody(event)
            const { photoId, x, y, width, height } = body
            if (!photoId) throw createError({ statusCode: 400, statusMessage: 'Photo ID is required' })
            if (x === undefined || y === undefined || width === undefined || height === undefined) {
                throw createError({ statusCode: 400, statusMessage: 'Crop parameters (x, y, width, height) are required' })
            }

            const photo = await db.query.photos.findFirst({
                where: and(eq(photos.id, photoId), eq(photos.albumId, id)),
            })
            if (!photo) throw createError({ statusCode: 404, statusMessage: 'Photo not found' })

            try {
                const photoBuffer = await readStorageFile(photo.storagePath)
                processedBuffer = await sharp(photoBuffer)
                    .extract({
                        left: Math.max(0, Math.round(x)),
                        top: Math.max(0, Math.round(y)),
                        width: Math.max(1, Math.round(width)),
                        height: Math.max(1, Math.round(height)),
                    })
                    .resize(COVER_MAX_DIMENSION, COVER_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                    .toFormat('jpeg', { quality: COVER_JPEG_QUALITY, progressive: true })
                    .toBuffer()
            } catch (err: any) {
                console.error('Server crop failed:', err)
                throw createError({ statusCode: 400, statusMessage: 'Failed to crop image on server' })
            }
        } else {
            const formData = await readMultipartFormData(event)
            if (!formData) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

            const fileData = formData.find(item => item.name === 'file')
            if (!fileData || !fileData.data) throw createError({ statusCode: 400, statusMessage: 'No file data' })

            const buffer = fileData.data
            try {
                processedBuffer = await sharp(buffer)
                    .resize(COVER_MAX_DIMENSION, COVER_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                    .toFormat('jpeg', { quality: COVER_JPEG_QUALITY, progressive: true })
                    .toBuffer()
            } catch {
                throw createError({ statusCode: 400, statusMessage: 'Failed to process image' })
            }
        }

        const fileHash = crypto.randomBytes(8).toString('hex')
        const coverFilename = `cover_${id}_${fileHash}.jpg`
        const thumbnailFilename = `cover_${id}_${fileHash}_thumb.webp`
        const thumbnailBuffer = await generateThumbnail(processedBuffer)
        coverPath = await saveFile(processedBuffer, coverFilename, 'photos')
        thumbnailPath = await saveFile(thumbnailBuffer, thumbnailFilename, 'thumbnails')

        let metadata: sharp.Metadata | undefined
        let blurhash = ''
        try {
            metadata = await sharp(processedBuffer).metadata()
            blurhash = await generateBlurhash(processedBuffer)
        } catch {}

        const [coverPhoto] = await db.insert(photos).values({
            id: crypto.randomUUID(),
            filename: coverFilename,
            originalName: `${album.title}_cover.jpg`,
            storagePath: coverPath,
            thumbnailStoragePath: thumbnailPath,
            size: processedBuffer.length,
            width: metadata?.width || 1,
            height: metadata?.height || 1,
            blurhash: blurhash || 'U6PVP-Kh0ffQfQfQfQfQ',
            mimeType: 'image/jpeg',
            fileHash: calculateFileHash(processedBuffer),
            albumId: id,
            uploaderId: user.id,
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
        }).returning()

        if (!coverPhoto) throw createError({ statusCode: 500, statusMessage: 'Failed to create cover photo' })

        // Delete old cover photo
        if (album.coverPhotoId) {
            const oldCover = await db.query.photos.findFirst({ where: eq(photos.id, album.coverPhotoId) })
            if (oldCover) {
                await deleteFile(oldCover.storagePath).catch(err => console.error('Failed to delete old cover file:', err))
                if (oldCover.thumbnailStoragePath && oldCover.thumbnailStoragePath !== oldCover.storagePath) {
                    await deleteFile(oldCover.thumbnailStoragePath).catch(err => console.error('Failed to delete old cover thumbnail:', err))
                }
                await db.delete(photos).where(eq(photos.id, oldCover.id)).catch(err => console.error('Failed to delete old cover photo record:', err))
            }
        }

        const [updatedAlbum] = await db.update(albums)
            .set({ coverPhotoId: coverPhoto.id })
            .where(eq(albums.id, id))
            .returning()

        if (!updatedAlbum) throw createError({ statusCode: 500, statusMessage: 'Failed to update album cover' })

        const updatedCoverPhoto = await db.query.photos.findFirst({
            where: eq(photos.id, updatedAlbum.coverPhotoId!),
            columns: { id: true, blurhash: true },
        })

        return { success: true, message: 'Album cover updated successfully', data: updatedCoverPhoto }
    } catch (error: any) {
        if (coverPath) await deleteFile(coverPath).catch(() => {})
        if (thumbnailPath && thumbnailPath !== coverPath) await deleteFile(thumbnailPath).catch(() => {})
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update album cover' })
    }
})
