import prisma from '../../../utils/prisma'
import { hashPassword, getUnixTimestamp } from '../../../utils/auth'

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

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: body.email },
        })

        if (existingUser) {
            throw createError({
                statusCode: 409,
                statusMessage: 'User already exists',
            })
        }

        // Hash password with Argon2id
        const passwordHash = await hashPassword(body.password)
        const now = getUnixTimestamp()

        // Create user
        const user = await prisma.user.create({
            data: {
                email: body.email,
                passwordHash,
                name: body.name,
                instagram: body.instagram,
                createdAt: now,
                updatedAt: now,
            },
            select: {
                id: true,
                email: true,
                name: true,
                instagram: true,
                createdAt: true,
            },
        })

        return {
            success: true,
            data: {
                ...user,
                createdAt: Number(user.createdAt),
            },
        }
    } catch (error: any) {
        console.error('Error creating user:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create user',
        })
    }
})
