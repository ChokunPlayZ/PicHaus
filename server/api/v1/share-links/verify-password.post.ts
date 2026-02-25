import prisma from '../../../utils/prisma'
import { verifyPassword, getUnixTimestamp } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { token, password } = body
    const now = getUnixTimestamp()

    if (!token || !password) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Token and password are required',
        })
    }

    const shareLink = await prisma.shareLink.findUnique({
        where: { token },
    })

    if (!shareLink) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Invalid link',
        })
    }

    if (shareLink.expiresAt && shareLink.expiresAt < now) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Invalid link',
        })
    }

    if (!shareLink.password) {
        return { success: true }
    }

    const isValid = await verifyPassword(shareLink.password, password)
    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid password',
        })
    }

    return { success: true }
})
