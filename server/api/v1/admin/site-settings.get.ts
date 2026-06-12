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

    const row = rows[0] ?? { siteName: 'PicHaus', accentColor: null, logoImageId: null, allowRegistration: false }

    return {
        success: true,
        data: {
            siteName: row.siteName,
            accentColor: row.accentColor,
            logoImageId: row.logoImageId,
            logoImageUrl: row.logoImageId ? `/api/assets/logo/${row.logoImageId}` : null,
            allowRegistration: row.allowRegistration,
        },
    }
})
