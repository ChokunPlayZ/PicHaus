import { eq, inArray } from 'drizzle-orm'
import { readFile, writeFile } from 'fs/promises'
import { photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getAbsoluteFilePath, generateBlurhash } from '../../../utils/upload'
import sharp from 'sharp'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)

        const photoIds = Array.isArray(body.photoIds)
            ? body.photoIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : []
        const angle = Number(body.angle)

        if (photoIds.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'At least one photo ID is required' })
        }
        if (![90, 180, 270, -90].includes(angle)) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid rotation angle. Must be 90, 180, 270, or -90.' })
        }

        // Fetch photos and check their album context to verify permissions
        const photoRows = await db.query.photos.findMany({
            where: inArray(photos.id, photoIds),
            with: { album: { with: { collaborators: true } } },
        })

        // Filters photos the user is authorized to edit
        const editablePhotos = photoRows.filter(photo => {
            const isOwner = photo.album.ownerId === user.id
            const isUploader = photo.uploaderId === user.id
            const isCollaborator = photo.album.collaborators.some(c => c.userId === user.id && c.role !== 'viewer')
            const isAdmin = user.role === 'ADMIN'
            return isOwner || isAdmin || (isCollaborator && isUploader)
        })

        if (editablePhotos.length === 0) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to modify any of the selected photos' })
        }

        const nowSeconds = Math.floor(Date.now() / 1000)
        const updatedPhotosList = []

        for (const photo of editablePhotos) {
            const originalPath = getAbsoluteFilePath(photo.storagePath)
            const thumbPath = photo.thumbnailStoragePath ? getAbsoluteFilePath(photo.thumbnailStoragePath) : null

            // Read original image
            const originalBuffer = await readFile(originalPath)

            // Rotate using sharp
            const rotatedOriginalBuffer = await sharp(originalBuffer)
                .rotate(angle)
                .toBuffer()

            // Save back
            await writeFile(originalPath, rotatedOriginalBuffer)

            // Rotate thumbnail if it exists
            if (thumbPath) {
                const thumbBuffer = await readFile(thumbPath)
                const rotatedThumbBuffer = await sharp(thumbBuffer)
                    .rotate(angle)
                    .toBuffer()
                await writeFile(thumbPath, rotatedThumbBuffer)
            }

            // Get new dimensions
            const meta = await sharp(rotatedOriginalBuffer).metadata()
            const newWidth = meta.width || photo.width
            const newHeight = meta.height || photo.height

            // Regenerate blurhash for the rotated orientation
            const newBlurhash = await generateBlurhash(rotatedOriginalBuffer)

            // Update database record
            const [updatedPhoto] = await db.update(photos).set({
                width: newWidth,
                height: newHeight,
                blurhash: newBlurhash,
                updatedAt: BigInt(nowSeconds),
            }).where(eq(photos.id, photo.id)).returning()

            if (!updatedPhoto) throw createError({ statusCode: 500, statusMessage: 'Failed to update photo record' })

            updatedPhotosList.push({
                id: updatedPhoto.id,
                width: updatedPhoto.width,
                height: updatedPhoto.height,
                blurhash: updatedPhoto.blurhash,
                updatedAt: Number(updatedPhoto.updatedAt)
            })
        }

        return {
            success: true,
            message: `Successfully rotated ${editablePhotos.length} photos.`,
            data: {
                updatedPhotos: updatedPhotosList
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to batch rotate photos' })
    }
})
