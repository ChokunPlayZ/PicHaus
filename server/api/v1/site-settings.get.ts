import { eq } from 'drizzle-orm'
import { siteSettings } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const rows = await db
        .select({
            siteName: siteSettings.siteName,
            accentColor: siteSettings.accentColor,
            logoImageId: siteSettings.logoImageId,
            allowRegistration: siteSettings.allowRegistration,
            googleOAuthEnabled: siteSettings.googleOAuthEnabled,
            googleOAuthShiftBypassEnabled: siteSettings.googleOAuthShiftBypassEnabled,
            googleButtonText: siteSettings.googleButtonText,
            googleButtonLogoId: siteSettings.googleButtonLogoId,
        })
        .from(siteSettings)
        .where(eq(siteSettings.id, 1))
        .limit(1)

    const row = rows[0] ?? { siteName: 'PicHaus', accentColor: null, logoImageId: null, allowRegistration: false, googleOAuthEnabled: false, googleOAuthShiftBypassEnabled: false, googleButtonText: null, googleButtonLogoId: null }

    // Only expose as enabled when env vars are actually configured
    const googleOAuthEnabled = row.googleOAuthEnabled && !!process.env.GOOGLE_CLIENT_ID

    return {
        success: true,
        data: {
            siteName: row.siteName,
            accentColor: row.accentColor,
            logoImageUrl: row.logoImageId ? `/api/assets/logo/${row.logoImageId}` : null,
            logoImageId: row.logoImageId,
            allowRegistration: row.allowRegistration,
            googleOAuthEnabled,
            googleOAuthShiftBypassEnabled: row.googleOAuthShiftBypassEnabled ?? false,
            googleButtonText: row.googleButtonText ?? null,
            googleButtonLogoUrl: row.googleButtonLogoId ? `/api/assets/logo/${row.googleButtonLogoId}` : null,
        },
    }
})
