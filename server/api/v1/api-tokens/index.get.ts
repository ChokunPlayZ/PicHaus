import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    // Require authentication
    const user = await requireAuth(event)

    // Get tokens
    const tokens = await prisma.apiToken.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
    })

    return {
        success: true,
        data: tokens.map((t: any) => ({
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
