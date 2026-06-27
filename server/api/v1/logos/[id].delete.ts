import { eq } from 'drizzle-orm'
import { unlink } from 'fs/promises'
import { logos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getAbsoluteFilePath } from '../../../utils/upload'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Logo ID required' })

    const logo = await db.query.logos.findFirst({ where: eq(logos.id, id) })
    if (!logo) throw createError({ statusCode: 404, statusMessage: 'Logo not found' })

    await db.delete(logos).where(eq(logos.id, id))

    try {
        await unlink(getAbsoluteFilePath(logo.storagePath))
    } catch {
        // File already gone — ignore
    }

    return { success: true }
})
