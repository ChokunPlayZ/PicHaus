import prisma from '../../../utils/prisma'
import { hashPassword, getUnixTimestamp } from '../../../utils/auth'
import { isSetupComplete } from '../../../utils/setup'

/**
 * Initial setup endpoint - creates the first admin user
 * Only works if no users exist in the database
 */
export default defineEventHandler(async (event) => {
    try {
        // Check if setup is already complete
        const setupComplete = await isSetupComplete()

        if (setupComplete) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Setup already completed',
            })
        }

        const body = await readBody(event)

        // Validate required fields
        if (!body.email || !body.password) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email and password are required',
            })
        }

        // Validate password strength
        if (body.password.length < 8) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Password must be at least 8 characters',
            })
        }

        // Hash password with Argon2id
        const passwordHash = await hashPassword(body.password)
        const now = getUnixTimestamp()

        // Create the first admin user
        const user = await prisma.user.create({
            data: {
                email: body.email,
                passwordHash,
                name: body.name || 'Admin',
                createdAt: now,
                updatedAt: now,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        })

        return {
            success: true,
            message: 'Setup completed successfully',
            data: {
                ...user,
                createdAt: Number(user.createdAt), // Convert BigInt to number
            },
        }
    } catch (error: any) {
        console.error('Error during setup:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to complete setup',
        })
    }
})
