import { eq } from 'drizzle-orm'
import { inviteTokens, users } from '../../db/schema'
import { getUnixTimestamp } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, 'token')
    if (!token) throw createError({ statusCode: 400, statusMessage: 'Token required' })

    const row = await db.query.inviteTokens.findFirst({
        where: eq(inviteTokens.token, token),
        with: { user: { columns: { email: true, name: true } } },
    })

    if (!row) throw createError({ statusCode: 404, statusMessage: 'Invalid or expired link' })
    if (row.usedAt) throw createError({ statusCode: 410, statusMessage: 'This link has already been used' })
    if (row.expiresAt < getUnixTimestamp()) throw createError({ statusCode: 410, statusMessage: 'This link has expired' })

    return {
        success: true,
        data: {
            type: row.type,
            label: row.label,
            expiresAt: Number(row.expiresAt),
            // For password_reset: prefill the email so user knows which account
            targetEmail: row.user?.email ?? null,
            targetName: row.user?.name ?? null,
        },
    }
})
