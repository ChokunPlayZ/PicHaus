import { eq } from 'drizzle-orm'
import { users } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const userId = getRouterParam(event, 'id')

        if (currentUser.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        if (!userId) throw createError({ statusCode: 400, statusMessage: 'User ID required' })
        if (userId === currentUser.id) throw createError({ statusCode: 400, statusMessage: 'Cannot delete yourself' })

        await db.delete(users).where(eq(users.id, userId))
        return { success: true, message: 'User deleted successfully' }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete user' })
    }
})
