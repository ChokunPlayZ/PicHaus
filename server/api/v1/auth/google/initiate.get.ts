import { eq } from 'drizzle-orm'
import { siteSettings } from '../../../../db/schema'
import { buildGoogleAuthUrl } from '../../../../utils/google-oauth'

export default defineEventHandler(async (event) => {
    const rows = await db
        .select({
            googleOAuthEnabled: siteSettings.googleOAuthEnabled,
            googleOAuthAllowedDomain: siteSettings.googleOAuthAllowedDomain,
            googleOAuthShiftBypassEnabled: siteSettings.googleOAuthShiftBypassEnabled,
        })
        .from(siteSettings)
        .where(eq(siteSettings.id, 1))
        .limit(1)

    if (!rows[0]?.googleOAuthEnabled) {
        throw createError({ statusCode: 403, statusMessage: 'Google sign-in is not enabled' })
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw createError({ statusCode: 500, statusMessage: 'Google OAuth is not configured on this server' })
    }

    const query = getQuery(event)
    const redirect = typeof query.redirect === 'string' ? query.redirect : ''
    const uploadToken = typeof query.uploadToken === 'string' ? query.uploadToken : ''
    const bypassDomain = query.bypassDomain === 'true'

    const state = Buffer.from(JSON.stringify({ redirect, uploadToken })).toString('base64url')

    const requestUrl = getRequestURL(event)
    const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/v1/auth/google/callback`

    const shiftBypassAllowed = rows[0]?.googleOAuthShiftBypassEnabled ?? false
    const allowedDomain = (bypassDomain && shiftBypassAllowed) ? undefined : (rows[0]?.googleOAuthAllowedDomain || undefined)
    const authUrl = buildGoogleAuthUrl(redirectUri, state, allowedDomain)
    return { success: true, data: { url: authUrl } }
})
