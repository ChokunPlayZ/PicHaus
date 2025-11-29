import prisma from '../../../utils/prisma'
import { hashPassword, getUnixTimestamp, requireAuth } from '../../../utils/auth'

/**
 * Promote a guest user (no password) to a registered user with login credentials
 */
export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const body = await readBody(event)

        // Validate required fields
        if (!body.userId || !body.email || !body.password) {
            throw createError({
                statusCode: 400,
                statusMessage: 'User ID, email, and password are required',
            })
        }

        // Verify the authenticated user matches the user to be promoted
        if (currentUser.id !== body.userId) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You can only promote your own account',
            })
        }

        // Find the guest user
        const user = await prisma.user.findUnique({
            where: { id: body.userId },
        })

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User not found',
            })
        }

        // Check if user already has a password
        if (user.passwordHash) {
            throw createError({
                statusCode: 400,
                statusMessage: 'User already has login credentials',
            })
        }

        // Check if email is already taken
        if (body.email !== user.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: body.email },
            })

            if (existingUser) {
                throw createError({
                    statusCode: 409,
                    statusMessage: 'Email already in use',
                })
            }
        }

        // Hash password and update user
        const passwordHash = await hashPassword(body.password)

        const updatedUser = await prisma.user.update({
            where: { id: body.userId },
            data: {
                email: body.email,
                passwordHash,
                name: body.name || user.name,
                instagram: body.instagram || user.instagram,
                updatedAt: getUnixTimestamp(),
            },
            select: {
                id: true,
                email: true,
                name: true,
                instagram: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return {
            success: true,
            message: 'Guest user promoted to registered user',
            data: updatedUser,
        }
    } catch (error: any) {
        console.error('Error promoting user:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to promote user',
        })
    }
})
