import { eq } from 'drizzle-orm'
import { inviteTokens, users } from '../../db/schema'
import { getUnixTimestamp, hashPassword, createAccessToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, 'token')
    if (!token) throw createError({ statusCode: 400, statusMessage: 'Token required' })

    const row = await db.query.inviteTokens.findFirst({
        where: eq(inviteTokens.token, token),
        with: { user: true },
    })

    if (!row) throw createError({ statusCode: 404, statusMessage: 'Invalid or expired link' })
    if (row.usedAt) throw createError({ statusCode: 410, statusMessage: 'This link has already been used' })
    if (row.expiresAt < getUnixTimestamp()) throw createError({ statusCode: 410, statusMessage: 'This link has expired' })

    const body = await readBody(event)
    const now = getUnixTimestamp()

    if (row.type === 'password_reset') {
        if (!row.userId || !row.user) throw createError({ statusCode: 400, statusMessage: 'Invalid reset token' })
        if (!body.password || body.password.length < 8) {
            throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
        }

        const passwordHash = await hashPassword(body.password)

        await db.update(users)
            .set({ passwordHash, updatedAt: now })
            .where(eq(users.id, row.userId))

        await db.update(inviteTokens)
            .set({ usedAt: now })
            .where(eq(inviteTokens.id, row.id))

        return { success: true, message: 'Password updated. You can now sign in.' }
    }

    if (row.type === 'invite') {
        const { name, email, password } = body
        if (!name || !email || !password) {
            throw createError({ statusCode: 400, statusMessage: 'Name, email, and password are required' })
        }
        if (password.length < 8) {
            throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
        }

        const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
        if (existing) throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })

        const passwordHash = await hashPassword(password)

        const [newUser] = await db.insert(users).values({
            email,
            name,
            passwordHash,
            createdAt: now,
            updatedAt: now,
        }).returning()

        await db.update(inviteTokens)
            .set({ usedAt: now })
            .where(eq(inviteTokens.id, row.id))

        const accessToken = await createAccessToken(newUser.id)

        return {
            success: true,
            message: 'Account created successfully.',
            data: { accessToken, id: newUser.id, name: newUser.name, email: newUser.email },
        }
    }

    throw createError({ statusCode: 400, statusMessage: 'Unknown token type' })
})
