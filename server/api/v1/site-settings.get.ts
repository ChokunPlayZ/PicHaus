import { eq } from 'drizzle-orm'
import { siteSettings } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const rows = await db
        .select({
            siteName: siteSettings.siteName,
            accentColor: siteSettings.accentColor,
            logoImageId: siteSettings.logoImageId,
            allowRegistration: siteSettings.allowRegistration,
        })
        .from(siteSettings)
        .where(eq(siteSettings.id, 1))
        .limit(1)

    const row = rows[0] ?? { siteName: 'PicHaus', accentColor: null, logoImageId: null, allowRegistration: false }

    return {
        success: true,
        data: {
            siteName: row.siteName,
            accentColor: row.accentColor,
            logoImageUrl: row.logoImageId ? `/api/assets/logo/${row.logoImageId}` : null,
            logoImageId: row.logoImageId,
            allowRegistration: row.allowRegistration,
        },
    }
})
