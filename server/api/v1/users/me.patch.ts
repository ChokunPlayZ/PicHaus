import prisma from '../../../utils/prisma'
import { requireAuth, hashPassword } from '../../../utils/auth'

/**
 * Update current user profile
 */
export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const body = await readBody(event)
        const { name, email, instagram, password } = body

        const updateData: any = {}

        if (name !== undefined) updateData.name = name
        if (instagram !== undefined) updateData.instagram = instagram

        // Handle email update
        if (email && email !== currentUser.email) {
            // Check if email is taken
            const existingUser = await prisma.user.findUnique({
                where: { email }
            })

            if (existingUser) {
                throw createError({ statusCode: 400, statusMessage: 'Email already in use' })
            }

            updateData.email = email
        }

        // Handle password update
        if (password) {
            if (password.length < 6) {
                throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters' })
            }
            updateData.passwordHash = await hashPassword(password)
        }

        const updatedUser = await prisma.user.update({
            where: { id: currentUser.id },
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
        console.error('Update profile error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update profile' })
    }
})
