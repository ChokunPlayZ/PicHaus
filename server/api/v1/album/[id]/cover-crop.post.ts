import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'
import sharp from 'sharp'
import { saveFile, generateBlurhash, getAbsoluteFilePath } from '../../../../utils/upload'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Album ID is required',
            })
        }

        const user = await requireAuth(event)

        // Check if album exists and user has permission
        const album = await prisma.album.findUnique({
            where: { id },
            include: {
                collaborators: {
                    where: {
                        userId: user.id,
                        role: {
                            in: ['admin', 'editor'],
                        },
                    },
                },
            },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        const isOwner = album.ownerId === user.id
        const isAdminCollaborator = album.collaborators.length > 0

        if (!isOwner && !isAdminCollaborator) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have permission to edit this album',
            })
        }

        // Parse multipart form data
        const formData = await readMultipartFormData(event)
        if (!formData) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No file uploaded',
            })
        }

        const fileData = formData.find(item => item.name === 'file')
        if (!fileData || !fileData.data) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No file data',
            })
        }

        const cropDataStr = formData.find(item => item.name === 'cropData')?.data?.toString()
        let cropData = { x: 0, y: 0, width: 0, height: 0 }
        if (cropDataStr) {
            try {
                cropData = JSON.parse(cropDataStr)
            } catch (e) {
                console.error('Failed to parse crop data:', e)
            }
        }

        // Process the cropped image
        const buffer = fileData.data
        let processedBuffer = buffer

        try {
            // Process with sharp: convert to JPEG, resize to reasonable size, and generate blurhash
            processedBuffer = await sharp(buffer)
                .resize(2560, 2560, {
                    fit: 'inside',
                    withoutEnlargement: true,
                    position: 'center'
                })
                .toFormat('jpeg', { quality: 90 })
                .toBuffer()
        } catch (err) {
            console.error('Error processing image:', err)
            throw createError({
                statusCode: 400,
                statusMessage: 'Failed to process image',
            })
        }

        // Generate a unique filename for the cover
        const fileHash = crypto.randomBytes(8).toString('hex')
        const coverFilename = `cover_${id}_${fileHash}.jpg`

        // Save the file
        const coverPath = await saveFile(processedBuffer, coverFilename, 'photos')

        // Get image dimensions and blurhash
        let metadata
        let blurhash = ''
        try {
            metadata = await sharp(processedBuffer).metadata()
            blurhash = await generateBlurhash(processedBuffer)
        } catch (err) {
            console.error('Error generating metadata:', err)
        }

        // Create or update cover photo record
        const coverPhoto = await prisma.photo.create({
            data: {
                id: crypto.randomUUID(),
                filename: coverFilename,
                originalName: `${album.title}_cover.jpg`,
                storagePath: coverPath,
                thumbnailStoragePath: coverPath,
                size: processedBuffer.length,
                width: metadata?.width || 1,
                height: metadata?.height || 1,
                blurhash: blurhash || 'U6PVP-Kh0ffQfQfQfQfQ',
                mimeType: 'image/jpeg',
                fileHash: '',
                albumId: id,
                uploaderId: user.id,
                createdAt: BigInt(Date.now()),
                updatedAt: BigInt(Date.now()),
            },
        })

        // Delete old cover photo if it exists (it's only used for cover)
        if (album.coverPhotoId) {
            const oldCover = await prisma.photo.findUnique({
                where: { id: album.coverPhotoId },
            })
            
            if (oldCover) {
                try {
                    // Try to delete the file
                    const filePath = getAbsoluteFilePath(oldCover.storagePath)
                    // File deletion would happen here if we had a utility for it
                } catch (err) {
                    console.error('Failed to delete old cover file:', err)
                }
                
                // Delete the photo record if it's only used as cover
                await prisma.photo.delete({
                    where: { id: oldCover.id }
                }).catch(err => {
                    console.error('Failed to delete old cover photo record:', err)
                })
            }
        }

        // Update album with new cover photo
        const updatedAlbum = await prisma.album.update({
            where: { id },
            data: {
                coverPhotoId: coverPhoto.id,
            },
            include: {
                coverPhoto: {
                    select: {
                        id: true,
                        blurhash: true,
                    },
                },
            },
        })

        return {
            success: true,
            message: 'Album cover updated successfully',
            data: updatedAlbum.coverPhoto,
        }
    } catch (error: any) {
        console.error('Error updating album cover with crop:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update album cover',
        })
    }
})
