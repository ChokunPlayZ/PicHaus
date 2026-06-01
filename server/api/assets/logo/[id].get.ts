import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { eq } from 'drizzle-orm'
import { logos } from '../../../db/schema'
import { getAbsoluteFilePath } from '../../../utils/upload'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    const logo = await db.query.logos.findFirst({
        where: eq(logos.id, id!),
    })

    if (!logo) throw createError({ statusCode: 404, statusMessage: 'Logo not found' })

    const filePath = getAbsoluteFilePath(logo.storagePath)

    try {
        const stats = await stat(filePath)

        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
        const safeMimeType = allowedMimeTypes.has(logo.mimeType) ? logo.mimeType : 'application/octet-stream'

        setHeader(event, 'Content-Type', safeMimeType)
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Length', stats.size)
        setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

        return sendStream(event, createReadStream(filePath))
    } catch {
        throw createError({ statusCode: 404, statusMessage: 'File not found on server' })
    }
})
