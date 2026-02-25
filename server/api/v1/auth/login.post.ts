import prisma from '../../../utils/prisma'
import { verifyPassword, setAuthCookie } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        // Validate required fields
        if (!body.email || !body.password) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email and password are required',
            })
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: body.email },
        })

        if (!user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid email or password',
            })
        }

        // Check if user has a password (not a guest user)
        if (!user.passwordHash) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid email or password',
            })
        }

        // Verify password
        const isValid = await verifyPassword(user.passwordHash, body.password)

        if (!isValid) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid email or password',
            })
        }

        await setAuthCookie(event, user.id)

        return {
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                instagram: user.instagram,
            },
        }
    } catch (error: any) {
        console.error('Error logging in:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to login',
        })
    }
})
