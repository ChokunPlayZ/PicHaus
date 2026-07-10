import { count, eq, sql } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { hashPassword, getUnixTimestamp } from '../../../utils/auth'
import { enforceRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    try {
        enforceRateLimit(event, { key: 'initial-setup', limit: 5, windowMs: 15 * 60 * 1000 })

        const body = await readBody(event)
        if (!body.email || !body.password) throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
        if (body.password.length < 8) throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })

        const passwordHash = await hashPassword(body.password)
        const now = getUnixTimestamp()

        const user = await db.transaction(async (tx) => {
            await tx.execute(sql`select pg_advisory_xact_lock(1346976841)`)

            const result = await tx.select({ value: count() }).from(users).where(eq(users.role, 'ADMIN'))
            if ((result[0]?.value ?? 0) > 0) {
                throw createError({ statusCode: 403, statusMessage: 'Setup already completed' })
            }

            const [created] = await tx.insert(users).values({
                email: body.email,
                passwordHash,
                name: body.name || 'Admin',
                role: 'ADMIN',
                createdAt: now,
                updatedAt: now,
            }).returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })

            return created
        })

        if (!user) throw createError({ statusCode: 500, statusMessage: 'Failed to create admin user during setup' })

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
