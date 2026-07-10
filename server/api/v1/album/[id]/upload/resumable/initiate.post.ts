import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../../../db/schema'
import { requireAuth } from '../../../../../../utils/auth'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import fs from 'node:fs/promises'
import { configuredUploadLimitBytes, resumableSessionDir, SHA256_RE } from '../../../../../../utils/resumable-upload'
import { enforceRateLimit } from '../../../../../../utils/rate-limit'

const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm|avi|mkv|wmv|flv|mpeg|mpg|3gp|3g2)$/i

export default defineEventHandler(async (event) => {
    try {
        enforceRateLimit(event, { key: 'resumable-initiate', limit: 100, windowMs: 60 * 60 * 1000 })
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

        const body = await readBody(event)
        const { filename, fileSize, fileHash, mimeType } = body
        if (!filename || !fileSize || !fileHash || !mimeType) {
            throw createError({ statusCode: 400, statusMessage: 'Missing required parameters: filename, fileSize, fileHash, mimeType' })
        }
        if (typeof fileHash !== 'string' || !SHA256_RE.test(fileHash)) {
            throw createError({ statusCode: 400, statusMessage: 'fileHash must be a SHA-256 hex digest' })
        }
        const maxFileSize = configuredUploadLimitBytes()
        if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > maxFileSize) {
            throw createError({ statusCode: 413, statusMessage: `File exceeds the ${Math.floor(maxFileSize / 1024 / 1024)}MB upload limit` })
        }
        if (String(mimeType).startsWith('video/') || VIDEO_FILE_RE.test(String(filename))) {
            throw createError({ statusCode: 400, statusMessage: 'Only image files can be uploaded. Videos are not supported.' })
        }

        // Duplicate check
        const duplicate = await db.query.photos.findFirst({
            where: and(eq(photos.albumId, albumId), eq(photos.fileHash, fileHash)),
        })
        if (duplicate) {
            return {
                success: true,
                duplicate: true,
                message: 'This photo already exists in the album',
            }
        }

        const uploadId = randomUUID()
        const sessionDir = resumableSessionDir(uploadId)
        const metaPath = join(sessionDir, 'meta.json')
        const dataPath = join(sessionDir, 'data.bin')

        try {
            await fs.mkdir(sessionDir, { recursive: true })
            await fs.writeFile(metaPath, JSON.stringify({
                uploadId,
                filename: String(filename),
                fileSize,
                fileHash: fileHash.toLowerCase(),
                mimeType: String(mimeType),
                albumId,
                uploaderId: user.id,
                createdAt: Date.now(),
            }), { flag: 'wx' })
            await fs.writeFile(dataPath, Buffer.alloc(0), { flag: 'wx' })
        } catch (err) {
            await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {})
            console.error('Failed to initiate resumable upload:', err)
            throw createError({ statusCode: 500, statusMessage: 'Failed to initiate upload session' })
        }

        return {
            success: true,
            uploadId,
            nextOffset: 0,
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to initiate resumable upload' })
    }
})
