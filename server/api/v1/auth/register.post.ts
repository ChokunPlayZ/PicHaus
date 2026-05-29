import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { hashPassword, getUnixTimestamp } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        if (!body.email || !body.password) {
            throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
        }

        const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) })
        if (existing) {
            throw createError({ statusCode: 409, statusMessage: 'User already exists' })
        }

        const passwordHash = await hashPassword(body.password)
        const now = getUnixTimestamp()

        const [user] = await db.insert(users).values({
            email: body.email,
            passwordHash,
            name: body.name,
            instagram: body.instagram,
            createdAt: now,
            updatedAt: now,
        }).returning({
            id: users.id,
            email: users.email,
            name: users.name,
            instagram: users.instagram,
            createdAt: users.createdAt,
        })

        return {
            success: true,
            data: { ...user, createdAt: Number(user.createdAt) },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })
    }
})
