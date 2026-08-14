import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'
import sharp from 'sharp'
import {
    calculateFileHash,
    saveFile,
    deleteFile,
    validateImageFile,
    generateUniqueFilename,
    createPhotoWithJobs,
} from '../../../../utils/upload'

export default defineEventHandler(async (event) => {
    let storagePath: string | null = null

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

        // Hash original file for deduplication (before any compression)
        const fileHash = calculateFileHash(fileData.data)

        const duplicate = await db.query.photos.findFirst({
            where: and(eq(photos.albumId, albumId), eq(photos.fileHash, fileHash)),
        })
        if (duplicate) throw createError({ statusCode: 409, statusMessage: 'This photo already exists in the album' })

        const originalFilename = fileData.filename || 'photo.jpg'
        const filename = generateUniqueFilename(originalFilename, fileHash)

        // Save original file to disk immediately
        storagePath = await saveFile(fileData.data, filename, 'photos')

        // Insert the photo row and enqueue background processing
        const photoId = await createPhotoWithJobs({
            storagePath: storagePath!,
            originalFilename,
            trustedMimeType,
            fileHash,
            albumId,
            uploaderId: user.id,
        })

        return {
            success: true,
            message: 'Photo uploaded successfully',
            photoId,
        }
    } catch (error: any) {
        if (storagePath) await deleteFile(storagePath).catch(() => {})
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to upload photo' })
    }
})
