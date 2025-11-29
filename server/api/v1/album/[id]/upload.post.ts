import prisma from '../../../../utils/prisma'
import { getUnixTimestamp } from '../../../../utils/auth'
import {
    calculateFileHash,
    generateThumbnail,
    generateBlurhash,
    extractExifData,
    saveFile,
    validateImageFile,
    generateUniqueFilename,
} from '../../../../utils/upload'

/**
 * Upload photo to album
 */
export default defineEventHandler(async (event) => {
    try {
        const albumId = getRouterParam(event, 'id')

        if (!albumId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Album ID is required',
            })
        }

        // Check if album exists
        const album = await prisma.album.findUnique({
            where: { id: albumId },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        // Get authenticated user (optional - can upload via upload link)
        const authToken = getCookie(event, 'auth-token')

        // Parse multipart form data
        const formData = await readMultipartFormData(event)

        if (!formData || formData.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No file uploaded',
            })
        }

        const fileData = formData.find(item => item.name === 'file')

        if (!fileData || !fileData.data) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No file data found',
            })
        }

        // Validate file
        const validation = validateImageFile(fileData.data)
        if (!validation.valid) {
            throw createError({
                statusCode: 400,
                statusMessage: validation.error || 'Invalid file',
            })
        }

        // Calculate file hash
        const fileHash = calculateFileHash(fileData.data)

        // Check for duplicate
        const existingPhoto = await prisma.photo.findFirst({
            where: {
                albumId,
                fileHash,
            },
        })

        if (existingPhoto) {
            throw createError({
                statusCode: 409,
                statusMessage: 'This photo already exists in the album',
            })
        }

        // Extract EXIF data
        const exifData = await extractExifData(fileData.data)

        // Generate thumbnail and blurhash
        const thumbnailBuffer = await generateThumbnail(fileData.data)
        const blurhash = await generateBlurhash(fileData.data)

        // Generate filenames
        const originalFilename = fileData.filename || 'photo.jpg'
        const filename = generateUniqueFilename(originalFilename, fileHash)
        const thumbnailFilename = generateUniqueFilename(originalFilename, fileHash, true) // WebP

        // Get directories from env
        const photoDir = process.env.PHOTO_DIR || 'uploads/photos'
        const thumbnailDir = process.env.THUMBNAIL_DIR || 'uploads/thumbnails'

        // Save files
        const url = await saveFile(fileData.data, filename, photoDir)
        const thumbnailUrl = await saveFile(thumbnailBuffer, thumbnailFilename, thumbnailDir)

        const now = getUnixTimestamp()

        // Create photo record
        const photo = await prisma.photo.create({
            data: {
                filename,
                originalName: originalFilename,
                url,
                thumbnailUrl,
                blurhash,
                size: fileData.data.length,
                mimeType: fileData.type || 'image/jpeg',
                fileHash,
                albumId,
                uploaderId: authToken || null,
                cameraModel: exifData.cameraModel || null,
                lens: exifData.lens || null,
                focalLength: exifData.focalLength || null,
                iso: exifData.iso || null,
                aperture: exifData.aperture || null,
                shutterSpeed: exifData.shutterSpeed || null,
                dateTaken: exifData.dateTaken ? BigInt(exifData.dateTaken) : null,
                createdAt: now,
                updatedAt: now,
            },
            include: {
                uploader: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })

        return {
            success: true,
            message: 'Photo uploaded successfully',
            data: {
                ...photo,
                dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
                createdAt: Number(photo.createdAt),
                updatedAt: Number(photo.updatedAt),
            },
        }
    } catch (error: any) {
        console.error('Error uploading photo:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to upload photo',
        })
    }
})
