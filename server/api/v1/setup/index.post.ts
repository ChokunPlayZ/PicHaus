import { users } from '../../../db/schema'
import { hashPassword, getUnixTimestamp } from '../../../utils/auth'
import { isSetupComplete } from '../../../utils/setup'

export default defineEventHandler(async (event) => {
    try {
        const setupComplete = await isSetupComplete()
        if (setupComplete) throw createError({ statusCode: 403, statusMessage: 'Setup already completed' })

        const body = await readBody(event)
        if (!body.email || !body.password) throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
        if (body.password.length < 8) throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })

        const passwordHash = await hashPassword(body.password)
        const now = getUnixTimestamp()

        const [user] = await db.insert(users).values({
            email: body.email,
            passwordHash,
            name: body.name || 'Admin',
            role: 'ADMIN',
            createdAt: now,
            updatedAt: now,
        }).returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })

        return {
            success: true,
            message: 'Setup completed successfully',
            data: { ...user, createdAt: Number(user.createdAt) },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to complete setup' })
    }
})
