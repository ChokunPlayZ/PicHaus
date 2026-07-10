import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators } from '../../../../../../db/schema'
import { requireAuth } from '../../../../../../utils/auth'
import { join } from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { calculateFileHash, generateUniqueFilename, processPhotoBackground, saveFile, validateImageFile } from '../../../../../../utils/upload'
import { configuredChunkLimitBytes, configuredUploadLimitBytes, resumableSessionDir, SHA256_RE } from '../../../../../../utils/resumable-upload'
import { enforceRateLimit } from '../../../../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    try {
        enforceRateLimit(event, { key: 'resumable-chunk', limit: 1000, windowMs: 60 * 60 * 1000 })
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

        const query = getQuery(event)
        const uploadId = query.uploadId as string
        const offset = parseInt(query.offset as string, 10)

        if (!uploadId || isNaN(offset)) {
            throw createError({ statusCode: 400, statusMessage: 'Missing uploadId or offset' })
        }

        const sessionDir = resumableSessionDir(uploadId)
        const metaPath = join(sessionDir, 'meta.json')
        const dataPath = join(sessionDir, 'data.bin')

        // Check if session exists
        let meta: { uploadId: string; filename: string; fileSize: number; fileHash: string; mimeType: string; albumId: string; uploaderId: string }
        try {
            meta = JSON.parse(await fs.readFile(metaPath, 'utf8'))
        } catch {
            throw createError({ statusCode: 404, statusMessage: 'Upload session not found or expired' })
        }
        if (
            meta.uploadId !== uploadId ||
            meta.albumId !== albumId ||
            meta.uploaderId !== user.id ||
            !Number.isSafeInteger(meta.fileSize) ||
            meta.fileSize <= 0 ||
            meta.fileSize > configuredUploadLimitBytes() ||
            !SHA256_RE.test(meta.fileHash)
        ) {
            throw createError({ statusCode: 403, statusMessage: 'Upload session does not belong to this user and album' })
        }

        // Verify offset matches current size of data.bin
        const stats = await fs.stat(dataPath)
        if (stats.size !== offset) {
            throw createError({
                statusCode: 409,
                statusMessage: `Offset mismatch. Server expects ${stats.size}, but client sent offset ${offset}`,
            })
        }

        // Read chunk data from body
        const maxChunkSize = configuredChunkLimitBytes()
        const declaredLength = Number(getRequestHeader(event, 'content-length') || '0')
        if (declaredLength > maxChunkSize) {
            throw createError({ statusCode: 413, statusMessage: 'Upload chunk is too large' })
        }
        const chunkBuffer = await readRawBody(event, false)
        if (!chunkBuffer || chunkBuffer.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'No chunk data received' })
        }
        if (chunkBuffer.length > maxChunkSize) {
            throw createError({ statusCode: 413, statusMessage: 'Upload chunk is too large' })
        }

        const newSize = stats.size + chunkBuffer.length
        if (newSize > meta.fileSize) {
            throw createError({ statusCode: 413, statusMessage: 'Upload exceeds the declared file size' })
        }

        // Append chunk
        await fs.appendFile(dataPath, chunkBuffer)

        if (newSize === meta.fileSize) {
            // Completed!
            const originalFilename = meta.filename || 'photo.jpg'
            const fileBuffer = await fs.readFile(dataPath)
            const validation = validateImageFile(fileBuffer)
            if (!validation.valid) throw createError({ statusCode: 400, statusMessage: validation.error || 'Invalid image file' })

            const actualHash = calculateFileHash(fileBuffer)
            if (actualHash !== meta.fileHash.toLowerCase()) {
                throw createError({ statusCode: 400, statusMessage: 'Uploaded file hash does not match' })
            }

            let trustedMimeType: string
            try {
                const metadata = await sharp(fileBuffer).metadata()
                const mimeTypeByFormat: Record<string, string> = {
                    jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
                    gif: 'image/gif', tiff: 'image/tiff', avif: 'image/avif', heif: 'image/heif', heic: 'image/heic',
                }
                trustedMimeType = metadata.format ? (mimeTypeByFormat[metadata.format] ?? '') : ''
                if (!trustedMimeType) throw new Error('unsupported image')
            } catch {
                throw createError({ statusCode: 400, statusMessage: 'Unsupported or invalid image format' })
            }

            const filename = generateUniqueFilename(originalFilename, actualHash)
            const storagePath = await saveFile(fileBuffer, filename, 'photos')

            // Clean up session directory
            await fs.rm(sessionDir, { recursive: true, force: true })

            // Run processing in background
            event.waitUntil((async () => {
                await processPhotoBackground({
                    storagePath,
                    originalFilename,
                    trustedMimeType,
                    fileHash: actualHash,
                    albumId,
                    uploaderId: user.id,
                })
            })())

            return {
                success: true,
                completed: true,
                nextOffset: newSize,
            }
        }

        return {
            success: true,
            completed: false,
            nextOffset: newSize,
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('Error uploading chunk:', error)
        throw createError({ statusCode: 500, statusMessage: 'Failed to upload chunk' })
    }
})
