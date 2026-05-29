import { eq, desc, isNull } from 'drizzle-orm'
import { inviteTokens, users } from '../../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../../utils/auth'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const now = getUnixTimestamp()

    const rows = await db.select({
        id: inviteTokens.id,
        token: inviteTokens.token,
        type: inviteTokens.type,
        label: inviteTokens.label,
        usedAt: inviteTokens.usedAt,
        expiresAt: inviteTokens.expiresAt,
        createdAt: inviteTokens.createdAt,
        userId: inviteTokens.userId,
        targetEmail: users.email,
        targetName: users.name,
    })
        .from(inviteTokens)
        .leftJoin(users, eq(inviteTokens.userId, users.id))
        .where(isNull(inviteTokens.usedAt))
        .orderBy(desc(inviteTokens.createdAt))

    return {
        success: true,
        data: rows.map(r => ({
            id: r.id,
            token: r.token,
            type: r.type,
            label: r.label,
            usedAt: r.usedAt ? Number(r.usedAt) : null,
            expiresAt: Number(r.expiresAt),
            createdAt: Number(r.createdAt),
            expired: r.expiresAt < now,
            targetEmail: r.targetEmail,
            targetName: r.targetName,
        })),
    }
})
