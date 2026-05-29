import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos, users } from '../../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../../utils/auth'
import crypto from 'crypto'
import sharp from 'sharp'
import {
    calculateFileHash,
    generateThumbnail,
    generateBlurhash,
    extractExifData,
    saveFile,
    deleteFile,
    validateImageFile,
    generateUniqueFilename,
} from '../../../../utils/upload'

export default defineEventHandler(async (event) => {
    let storagePath: string | null = null
    let thumbnailStoragePath: string | null = null

    try {
        const albumId = getRouterParam(event, 'id')
        if (!albumId) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const album = await db.query.albums.findFirst({ where: eq(albums.id, albumId) })
        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

        const user = await requireAuth(event)

        if (album.ownerId !== user.id) {
            const collaborator = await db.query.albumCollaborators.findFirst({
                where: and(
                    eq(albumCollaborators.albumId, albumId),
                    eq(albumCollaborators.userId, user.id),
                    inArray(albumCollaborators.role, ['admin', 'editor']),
                ),
            })
            if (!collaborator) throw createError({ statusCode: 403, statusMessage: 'You do not have permission to upload to this album' })
        }

        const formData = await readMultipartFormData(event)
        if (!formData || formData.length === 0) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

        const fileData = formData.find(item => item.name === 'file')
        if (!fileData || !fileData.data) throw createError({ statusCode: 400, statusMessage: 'No file data found' })

        const validation = validateImageFile(fileData.data)
        if (!validation.valid) throw createError({ statusCode: 400, statusMessage: validation.error || 'Invalid file' })

        let trustedMimeType = 'application/octet-stream'
        try {
            const metadata = await sharp(fileData.data).metadata()
            const format = metadata.format
            const mimeTypeByFormat: Record<string, string> = {
                jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
                gif: 'image/gif', tiff: 'image/tiff', avif: 'image/avif', heif: 'image/heif', heic: 'image/heic',
            }
            if (!format || !mimeTypeByFormat[format]) throw createError({ statusCode: 400, statusMessage: 'Unsupported or invalid image format' })
            trustedMimeType = mimeTypeByFormat[format]
        } catch (error: any) {
            if (error?.statusCode) throw error
            throw createError({ statusCode: 400, statusMessage: 'Invalid image file' })
        }

        const fileHash = calculateFileHash(fileData.data)

        const duplicate = await db.query.photos.findFirst({
            where: and(eq(photos.albumId, albumId), eq(photos.fileHash, fileHash)),
        })
        if (duplicate) throw createError({ statusCode: 409, statusMessage: 'This photo already exists in the album' })

        const exifData = await extractExifData(fileData.data)
        const thumbnailBuffer = await generateThumbnail(fileData.data)
        const blurhash = await generateBlurhash(fileData.data)

        const originalFilename = fileData.filename || 'photo.jpg'
        const filename = generateUniqueFilename(originalFilename, fileHash)
        const thumbnailFilename = generateUniqueFilename(originalFilename, fileHash, true)
        const photoId = crypto.randomUUID()

        storagePath = await saveFile(fileData.data, filename, 'photos')
        thumbnailStoragePath = await saveFile(thumbnailBuffer, thumbnailFilename, 'thumbnails')

        const now = getUnixTimestamp()

        const [photo] = await db.insert(photos).values({
            id: photoId,
            filename,
            originalName: originalFilename,
            storagePath,
            thumbnailStoragePath,
            blurhash,
            size: fileData.data.length,
            mimeType: trustedMimeType,
            fileHash,
            albumId,
            uploaderId: user.id,
            cameraModel: exifData.cameraModel || null,
            lens: exifData.lens || null,
            focalLength: exifData.focalLength || null,
            iso: exifData.iso || null,
            aperture: exifData.aperture || null,
            shutterSpeed: exifData.shutterSpeed || null,
            dateTaken: exifData.dateTaken ? BigInt(exifData.dateTaken) : null,
            width: exifData.width || 0,
            height: exifData.height || 0,
            createdAt: now,
            updatedAt: now,
        }).returning()

        const uploader = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: { id: true, name: true },
        })

        return {
            success: true,
            message: 'Photo uploaded successfully',
            data: {
                ...photo,
                dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
                createdAt: Number(photo.createdAt),
                updatedAt: Number(photo.updatedAt),
                uploader,
            },
        }
    } catch (error: any) {
        if (storagePath) await deleteFile(storagePath).catch(() => {})
        if (thumbnailStoragePath) await deleteFile(thumbnailStoragePath).catch(() => {})
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to upload photo' })
    }
})
