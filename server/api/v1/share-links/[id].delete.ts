import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')

    const link = await prisma.shareLink.findUnique({
        where: { id },
        include: { album: true }
    })

    if (!link) {
        throw createError({ statusCode: 404, statusMessage: 'Link not found' })
    }

    if (link.album.ownerId !== user.id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    await prisma.shareLink.delete({
        where: { id }
    })

    return {
        success: true,
        message: 'Link deleted'
    }
})
