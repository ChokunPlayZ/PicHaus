import { eq } from 'drizzle-orm'
import { apiTokens } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Token ID is required' })

    const token = await db.query.apiTokens.findFirst({ where: eq(apiTokens.id, id) })
    if (!token) throw createError({ statusCode: 404, statusMessage: 'Token not found' })
    if (token.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    await db.delete(apiTokens).where(eq(apiTokens.id, id))
    return { success: true, message: 'Token revoked successfully' }
})
