import { eq } from 'drizzle-orm'
import { users } from '../../../../../db/schema'
import { requireAuth, createAccessToken } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const admin = await requireAuth(event)
    if (admin.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

    const targetId = getRouterParam(event, 'id')
    if (!targetId) throw createError({ statusCode: 400, statusMessage: 'User ID is required' })

    const target = await db.query.users.findFirst({ where: eq(users.id, targetId) })
    if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

    const accessToken = await createAccessToken(target.id)

    return {
        success: true,
        data: {
            accessToken,
            name: target.name,
            email: target.email,
        },
    }
})
