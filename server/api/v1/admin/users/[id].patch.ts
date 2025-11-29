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
        const { role, name, email, instagram } = body

        if (currentUser.role !== 'ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }

        if (!userId) {
            throw createError({ statusCode: 400, statusMessage: 'User ID required' })
        }

        const updateData: any = {}

        // Handle role update
        if (role) {
            if (!['USER', 'ADMIN'].includes(role)) {
                throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
            }

            // Prevent demoting self if it's the last admin
            if (userId === currentUser.id && role !== 'ADMIN') {
                const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
                if (adminCount <= 1) {
                    throw createError({ statusCode: 400, statusMessage: 'Cannot demote the last admin' })
                }
            }
            updateData.role = role
        }

        if (name !== undefined) updateData.name = name
        if (instagram !== undefined) updateData.instagram = instagram

        // Handle email update
        if (email) {
            // Check if email is taken by another user
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: userId }
                }
            })

            if (existingUser) {
                throw createError({ statusCode: 400, statusMessage: 'Email already in use' })
            }
            updateData.email = email
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                instagram: true,
                role: true,
                createdAt: true
            }
        })

        return {
            success: true,
            data: {
                ...updatedUser,
                createdAt: Number(updatedUser.createdAt)
            }
        }

    } catch (error: any) {
        console.error('Update user error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update user' })
    }
})
