import { eq, desc } from 'drizzle-orm'
import { apiTokens } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const tokens = await db.select()
        .from(apiTokens)
        .where(eq(apiTokens.userId, user.id))
        .orderBy(desc(apiTokens.createdAt))

    return {
        success: true,
        data: tokens.map(t => ({
            id: t.id,
            name: t.name,
            prefix: t.tokenPrefix,
            scopes: t.scopes,
            lastUsedAt: t.lastUsedAt ? Number(t.lastUsedAt) : null,
            expiresAt: t.expiresAt ? Number(t.expiresAt) : null,
            createdAt: Number(t.createdAt),
        })),
    }
})
