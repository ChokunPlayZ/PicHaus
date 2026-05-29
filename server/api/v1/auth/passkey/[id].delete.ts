import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Passkey ID is required' })
    }

    const passkey = await prisma.passkey.findUnique({ where: { id } })

    if (!passkey || passkey.userId !== user.id) {
        throw createError({ statusCode: 404, statusMessage: 'Passkey not found' })
    }

    await prisma.passkey.delete({ where: { id } })

    return { success: true }
})
