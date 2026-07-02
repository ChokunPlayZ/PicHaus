import { consumePendingMicrosoftAuth } from '../../../../utils/microsoft-oauth'

export default defineEventHandler(async (event) => {
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
