import { eq } from 'drizzle-orm'
import { inviteTokens } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

    const token = await db.query.inviteTokens.findFirst({ where: eq(inviteTokens.id, id) })
    if (!token) throw createError({ statusCode: 404, statusMessage: 'Token not found' })

    await db.delete(inviteTokens).where(eq(inviteTokens.id, id))
    return { success: true }
})
