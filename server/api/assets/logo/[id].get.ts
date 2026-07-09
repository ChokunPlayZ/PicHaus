import { eq } from 'drizzle-orm'
import { logos } from '../../../db/schema'
import { getDirectAssetUrl, getStorageObject, statStorageFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    const logo = await db.query.logos.findFirst({
        where: eq(logos.id, id!),
    })

    if (!logo) throw createError({ statusCode: 404, statusMessage: 'Logo not found' })

    try {
        const metadata = await statStorageFile(logo.storagePath)

        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
        const safeMimeType = allowedMimeTypes.has(logo.mimeType) ? logo.mimeType : 'application/octet-stream'
        const directUrl = getDirectAssetUrl(logo.storagePath)
        if (directUrl) return sendRedirect(event, directUrl, 302)

        setHeader(event, 'Content-Type', safeMimeType)
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Length', metadata.size)
        setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

        const object = await getStorageObject(logo.storagePath)
        return sendStream(event, object.body)
    } catch {
        throw createError({ statusCode: 404, statusMessage: 'File not found on server' })
    }
})
