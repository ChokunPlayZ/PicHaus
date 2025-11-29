import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

/**
 * Delete user (Admin only)
 */
export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const userId = getRouterParam(event, 'id')

        if (currentUser.role !== 'ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }

        if (!userId) {
            throw createError({ statusCode: 400, statusMessage: 'User ID required' })
        }

        if (userId === currentUser.id) {
            throw createError({ statusCode: 400, statusMessage: 'Cannot delete yourself' })
        }

        // Delete user (cascade will handle related data like albums, photos, etc. based on schema)
        // Schema says:
        // owner   User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
        // uploader   User?   @relation(fields: [uploaderId], references: [id], onDelete: SetNull)
        // albumCollaborators ... onDelete: Cascade

        await prisma.user.delete({
            where: { id: userId }
        })

        return {
            success: true,
            message: 'User deleted successfully'
        }

    } catch (error: any) {
        console.error('Delete user error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete user' })
    }
})
