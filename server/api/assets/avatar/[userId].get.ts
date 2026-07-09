import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { getDirectAssetUrl, getStorageObject, statStorageFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
    const userId = getRouterParam(event, 'userId')
    if (!userId) throw createError({ statusCode: 400, statusMessage: 'Missing userId' })

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user?.avatarPath) throw createError({ statusCode: 404, statusMessage: 'No avatar' })

    try {
        const metadata = await statStorageFile(user.avatarPath)
        const directUrl = getDirectAssetUrl(user.avatarPath)
        if (directUrl) return sendRedirect(event, directUrl, 302)

        setHeader(event, 'Content-Type', 'image/webp')
        setHeader(event, 'Content-Length', metadata.size)
        setHeader(event, 'Cache-Control', 'public, max-age=86400')
        const object = await getStorageObject(user.avatarPath)
        return sendStream(event, object.body)
    } catch {
        throw createError({ statusCode: 404, statusMessage: 'Avatar file not found' })
    }
})
