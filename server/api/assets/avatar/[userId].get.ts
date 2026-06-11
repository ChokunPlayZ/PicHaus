import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'

export default defineEventHandler(async (event) => {
    const userId = getRouterParam(event, 'userId')
    if (!userId) throw createError({ statusCode: 400, statusMessage: 'Missing userId' })

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user?.avatarPath) throw createError({ statusCode: 404, statusMessage: 'No avatar' })

    const storageBase = process.env.STORAGE_DIR || 'storage/uploads'
    const filePath = join(process.cwd(), storageBase, user.avatarPath)

    try {
        const stats = await stat(filePath)
        setHeader(event, 'Content-Type', 'image/webp')
        setHeader(event, 'Content-Length', stats.size)
        setHeader(event, 'Cache-Control', 'public, max-age=86400')
        return sendStream(event, createReadStream(filePath))
    } catch {
        throw createError({ statusCode: 404, statusMessage: 'Avatar file not found' })
    }
})
