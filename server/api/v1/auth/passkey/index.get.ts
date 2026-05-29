import { eq, desc } from 'drizzle-orm'
import { passkeys } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const rows = await db.select({
        id: passkeys.id,
        name: passkeys.name,
        transports: passkeys.transports,
        deviceType: passkeys.deviceType,
        backedUp: passkeys.backedUp,
        createdAt: passkeys.createdAt,
        lastUsedAt: passkeys.lastUsedAt,
    })
        .from(passkeys)
        .where(eq(passkeys.userId, user.id))
        .orderBy(desc(passkeys.createdAt))

    return {
        success: true,
        data: rows.map(p => ({
            ...p,
            createdAt: Number(p.createdAt),
            lastUsedAt: p.lastUsedAt ? Number(p.lastUsedAt) : null,
        })),
    }
})
