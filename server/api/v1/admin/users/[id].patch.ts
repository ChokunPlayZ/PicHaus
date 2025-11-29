import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

/**
 * Update user role (Admin only)
 */
export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const userId = getRouterParam(event, 'id')
        const body = await readBody(event)
        const { role } = body

        if (currentUser.role !== 'ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }

        if (!userId) {
            throw createError({ statusCode: 400, statusMessage: 'User ID required' })
        }

        if (!['USER', 'ADMIN'].includes(role)) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
        }

        // Prevent demoting self if it's the last admin (optional safety, but good practice)
        if (userId === currentUser.id && role !== 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
            if (adminCount <= 1) {
                throw createError({ statusCode: 400, statusMessage: 'Cannot demote the last admin' })
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                role: true,
            }
        })

        return {
            success: true,
            data: updatedUser
        }

    } catch (error: any) {
        console.error('Update user role error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update user role' })
    }
})
