import { eq } from 'drizzle-orm'
import { siteSettings } from '../../../../db/schema'
import { buildMicrosoftAuthUrl } from '../../../../utils/microsoft-oauth'

export default defineEventHandler(async (event) => {
    const rows = await db
        .select({
            microsoftOAuthEnabled: siteSettings.microsoftOAuthEnabled,
            microsoftOAuthTenantId: siteSettings.microsoftOAuthTenantId,
        })
        .from(siteSettings)
        .where(eq(siteSettings.id, 1))
        .limit(1)

    if (!rows[0]?.microsoftOAuthEnabled) {
        throw createError({ statusCode: 403, statusMessage: 'Microsoft sign-in is not enabled' })
    }
    if (!process.env.MICROSOFT_CLIENT_ID) {
        throw createError({ statusCode: 500, statusMessage: 'Microsoft OAuth is not configured on this server' })
    }

    const query = getQuery(event)
    const redirect = typeof query.redirect === 'string' ? query.redirect : ''
    const uploadToken = typeof query.uploadToken === 'string' ? query.uploadToken : ''

    const state = Buffer.from(JSON.stringify({ redirect, uploadToken })).toString('base64url')

    const requestUrl = getRequestURL(event)
    const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/v1/auth/microsoft/callback`

    const tenantId = rows[0]?.microsoftOAuthTenantId || 'common'
    const authUrl = buildMicrosoftAuthUrl(redirectUri, state, tenantId)

    return { success: true, data: { url: authUrl } }
})
