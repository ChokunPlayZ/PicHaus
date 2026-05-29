import { eq } from 'drizzle-orm'
import { inviteTokens, users } from '../../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../../utils/auth'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
    const admin = await requireAuth(event)
    if (admin.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const body = await readBody(event)
    const { type, userId, label, expiresInHours } = body

    if (!['invite', 'password_reset'].includes(type)) {
        throw createError({ statusCode: 400, statusMessage: 'type must be "invite" or "password_reset"' })
    }

    if (type === 'password_reset') {
        if (!userId) throw createError({ statusCode: 400, statusMessage: 'userId is required for password_reset' })
        const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
        if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const now = getUnixTimestamp()
    const defaultHours = type === 'invite' ? 168 : 24 // invite: 7 days, reset: 24 h
    const hours = Number(expiresInHours) > 0 ? Number(expiresInHours) : defaultHours
    const expiresAt = now + BigInt(hours * 3600)

    const token = nanoid(32)

    const [row] = await db.insert(inviteTokens).values({
        token,
        type,
        userId: userId ?? null,
        label: label ?? null,
        expiresAt,
        createdAt: now,
        createdBy: admin.id,
    }).returning()

    return {
        success: true,
        data: {
            id: row.id,
            token: row.token,
            type: row.type,
            expiresAt: Number(row.expiresAt),
            createdAt: Number(row.createdAt),
        },
    }
})
