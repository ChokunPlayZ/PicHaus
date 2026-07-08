import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../../../db/schema'
import { requireAuth } from '../../../../../../utils/auth'
import { join } from 'path'
import fs from 'fs/promises'

const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm|avi|mkv|wmv|flv|mpeg|mpg|3gp|3g2)$/i

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

        const body = await readBody(event)
        const { filename, fileSize, fileHash, mimeType } = body
        if (!filename || !fileSize || !fileHash || !mimeType) {
            throw createError({ statusCode: 400, statusMessage: 'Missing required parameters: filename, fileSize, fileHash, mimeType' })
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

        const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
        const sessionDir = join(process.cwd(), storageBaseDir, 'resumable', fileHash)
        const metaPath = join(sessionDir, 'meta.json')
        const dataPath = join(sessionDir, 'data.bin')

        let nextOffset = 0
        try {
            await fs.mkdir(sessionDir, { recursive: true })
            let existingMeta = null
            try {
                existingMeta = JSON.parse(await fs.readFile(metaPath, 'utf8'))
            } catch {}

            if (existingMeta && existingMeta.fileSize === fileSize) {
                // Resume existing upload
                try {
                    const stats = await fs.stat(dataPath)
                    nextOffset = stats.size
                } catch {
                    nextOffset = 0
                }
            } else {
                // Start a new upload
                await fs.writeFile(metaPath, JSON.stringify({
                    filename,
                    fileSize,
                    fileHash,
                    mimeType,
                    albumId,
                    uploaderId: user.id,
                }))
                await fs.writeFile(dataPath, Buffer.alloc(0))
            }
        } catch (err) {
            console.error('Failed to initiate resumable upload:', err)
            throw createError({ statusCode: 500, statusMessage: 'Failed to initiate upload session' })
        }

        return {
            success: true,
            uploadId: fileHash,
            nextOffset,
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to initiate resumable upload' })
    }
})
