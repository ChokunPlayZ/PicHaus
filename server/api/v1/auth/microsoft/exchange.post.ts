import { consumePendingMicrosoftAuth } from '../../../../utils/microsoft-oauth'
import { enforceRateLimit } from '../../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, { key: 'microsoft-exchange', limit: 20, windowMs: 5 * 60 * 1000 })
    const body = await readBody(event)
    const { code } = body

    if (!code || typeof code !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Code is required' })
    }

    const pending = consumePendingMicrosoftAuth(code)
    if (!pending) {
        throw createError({ statusCode: 401, statusMessage: 'Invalid or expired sign-in code' })
    }

    return {
        success: true,
        data: {
            accessToken: pending.accessToken,
            name: pending.name,
            email: pending.email,
            state: pending.state,
            isNewUser: pending.isNewUser,
        },
    }
})
