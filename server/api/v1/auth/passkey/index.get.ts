import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const passkeys = await prisma.passkey.findMany({
        where: { userId: user.id },
        select: {
            id: true,
            name: true,
            transports: true,
            deviceType: true,
            backedUp: true,
            createdAt: true,
            lastUsedAt: true,
        },
        orderBy: { createdAt: 'desc' },
    })

    return {
        success: true,
        data: passkeys.map(p => ({
            ...p,
            createdAt: Number(p.createdAt),
            lastUsedAt: p.lastUsedAt ? Number(p.lastUsedAt) : null,
        })),
    }
})
