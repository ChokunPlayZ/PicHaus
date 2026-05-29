import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { verifyPassword, createAccessToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        if (!body.email || !body.password) {
            throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
        }

        const user = await db.query.users.findFirst({ where: eq(users.email, body.email) })

        if (!user || !user.passwordHash) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
        }

        const isValid = await verifyPassword(user.passwordHash, body.password)
        if (!isValid) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
        }

        const accessToken = await createAccessToken(user.id)

        return {
            success: true,
            message: 'Login successful',
            data: { accessToken, id: user.id, email: user.email, name: user.name, instagram: user.instagram },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to login' })
    }
})
