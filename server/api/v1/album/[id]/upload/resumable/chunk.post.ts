import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators } from '../../../../../../db/schema'
import { requireAuth } from '../../../../../../utils/auth'
import { join } from 'path'
import fs from 'fs/promises'
import { generateUniqueFilename, processPhotoBackground } from '../../../../../../utils/upload'

export default defineEventHandler(async (event) => {
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

        const query = getQuery(event)
        const uploadId = query.uploadId as string
        const offset = parseInt(query.offset as string, 10)

        if (!uploadId || isNaN(offset)) {
            throw createError({ statusCode: 400, statusMessage: 'Missing uploadId or offset' })
        }

        const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
        const sessionDir = join(process.cwd(), storageBaseDir, 'resumable', uploadId)
        const metaPath = join(sessionDir, 'meta.json')
        const dataPath = join(sessionDir, 'data.bin')

        // Check if session exists
        let meta = null
        try {
            meta = JSON.parse(await fs.readFile(metaPath, 'utf8'))
        } catch {
            throw createError({ statusCode: 404, statusMessage: 'Upload session not found or expired' })
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
        const chunkBuffer = await readRawBody(event, false)
        if (!chunkBuffer || chunkBuffer.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'No chunk data received' })
        }

        // Append chunk
        await fs.appendFile(dataPath, chunkBuffer)

        const newSize = stats.size + chunkBuffer.length

        if (newSize >= meta.fileSize) {
            // Completed!
            const originalFilename = meta.filename || 'photo.jpg'
            const filename = generateUniqueFilename(originalFilename, meta.fileHash)

            // Move the file to the final destination
            const uploadDir = join(process.cwd(), storageBaseDir, 'photos')
            await fs.mkdir(uploadDir, { recursive: true })
            const finalFilePath = join(uploadDir, filename)
            
            // Move file
            await fs.rename(dataPath, finalFilePath)
            const storagePath = `photos/${filename}`

            // Clean up session directory
            await fs.rm(sessionDir, { recursive: true, force: true })

            // Run processing in background
            event.waitUntil((async () => {
                await processPhotoBackground({
                    storagePath,
                    originalFilename,
                    trustedMimeType: meta.mimeType,
                    fileHash: meta.fileHash,
                    albumId: meta.albumId,
                    uploaderId: meta.uploaderId,
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
