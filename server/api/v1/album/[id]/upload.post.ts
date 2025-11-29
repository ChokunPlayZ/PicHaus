import prisma from '../../../../utils/prisma'
import { getUnixTimestamp, requireAuth } from '../../../../utils/auth'
import crypto from 'crypto'
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

        // Get authenticated user
        const user = await requireAuth(event)

        // Check permissions
        const isOwner = album.ownerId === user.id
        // TODO: Check for collaborator permissions if needed

        if (!isOwner) {
            // Check if user is a collaborator with editor role
            const collaborator = await prisma.albumCollaborator.findFirst({
                where: {
                    albumId,
                    userId: user.id,
                    role: { in: ['admin', 'editor'] }
                }
            })

            if (!collaborator) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'You do not have permission to upload to this album',
                })
            }
        }

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

        // Generate ID upfront
        const photoId = crypto.randomUUID()

        // Save files
        // saveFile now returns the relative storage path
        const storagePath = await saveFile(fileData.data, filename, 'photos')
        const thumbnailStoragePath = await saveFile(thumbnailBuffer, thumbnailFilename, 'thumbnails')

        const url = `/api/assets/${photoId}/full`
        const thumbnailUrl = `/api/assets/${photoId}/thumb`

        const now = getUnixTimestamp()

        // Create photo record
        const photo = await prisma.photo.create({
            data: {
                id: photoId,
                filename,
                originalName: originalFilename,
                url,
                thumbnailUrl,
                storagePath,
                thumbnailStoragePath,
                blurhash,
                size: fileData.data.length,
                mimeType: fileData.type || 'image/jpeg',
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
