import { eq } from 'drizzle-orm'
import { siteSettings } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

    const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.id, 1))
        .limit(1)

    const row = rows[0] ?? { siteName: 'PicHaus', accentColor: null, logoImageId: null, allowRegistration: false, googleOAuthEnabled: false, googleOAuthAllowedDomain: null }

    return {
        success: true,
        data: {
            siteName: row.siteName,
            accentColor: row.accentColor,
            logoImageId: row.logoImageId,
            logoImageUrl: row.logoImageId ? `/api/assets/logo/${row.logoImageId}` : null,
            allowRegistration: row.allowRegistration,
            googleOAuthEnabled: row.googleOAuthEnabled,
            googleOAuthAllowedDomain: row.googleOAuthAllowedDomain ?? '',
            googleOAuthShiftBypassEnabled: row.googleOAuthShiftBypassEnabled ?? false,
            googleButtonText: row.googleButtonText ?? '',
            googleButtonLogoId: row.googleButtonLogoId ?? null,
            googleButtonLogoUrl: row.googleButtonLogoId ? `/api/assets/logo/${row.googleButtonLogoId}` : null,
            googleClientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
            microsoftOAuthEnabled: row.microsoftOAuthEnabled ?? false,
            microsoftOAuthTenantId: row.microsoftOAuthTenantId ?? '',
            microsoftButtonText: row.microsoftButtonText ?? '',
            microsoftButtonLogoId: row.microsoftButtonLogoId ?? null,
            microsoftButtonLogoUrl: row.microsoftButtonLogoId ? `/api/assets/logo/${row.microsoftButtonLogoId}` : null,
            microsoftClientIdConfigured: !!process.env.MICROSOFT_CLIENT_ID,
        },
    }
})
