import { eq } from 'drizzle-orm'
import { shareLinks } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.id, id),
        with: {
            album: { columns: { ownerId: true } },
            shareGroup: { columns: { ownerId: true } },
        },
    })

    if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

    const isOwner = (link.album?.ownerId === user.id) || (link.shareGroup?.ownerId === user.id)
    if (!isOwner && user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })

    await db.delete(shareLinks).where(eq(shareLinks.id, id))
    return { success: true, message: 'Link deleted' }
})
