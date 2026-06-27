import { desc, eq, count, or } from 'drizzle-orm'
import { logos, albums, shareGroups, siteSettings } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireAuth(event)

    const rows = await db.select({
        id: logos.id,
        originalName: logos.originalName,
        mimeType: logos.mimeType,
        uploadedAt: logos.uploadedAt,
    })
        .from(logos)
        .orderBy(desc(logos.uploadedAt))

    if (rows.length === 0) return { success: true, data: [] }

    const logoIds = rows.map(r => r.id)

    const [albumUsage, groupUsage, siteRow] = await Promise.all([
        db.select({ logoImageId: albums.logoImageId, cnt: count() })
            .from(albums)
            .where(or(...logoIds.map(id => eq(albums.logoImageId, id))))
            .groupBy(albums.logoImageId),
        db.select({ logoImageId: shareGroups.logoImageId, cnt: count() })
            .from(shareGroups)
            .where(or(...logoIds.map(id => eq(shareGroups.logoImageId, id))))
            .groupBy(shareGroups.logoImageId),
        db.select({ logoImageId: siteSettings.logoImageId, googleButtonLogoId: siteSettings.googleButtonLogoId })
            .from(siteSettings)
            .where(eq(siteSettings.id, 1))
            .limit(1)
            .then(r => r[0] ?? null),
    ])

    const albumMap = new Map(albumUsage.map(r => [r.logoImageId, Number(r.cnt)]))
    const groupMap = new Map(groupUsage.map(r => [r.logoImageId, Number(r.cnt)]))

    return {
        success: true,
        data: rows.map(logo => ({
            id: logo.id,
            originalName: logo.originalName,
            mimeType: logo.mimeType,
            uploadedAt: Number(logo.uploadedAt),
            url: `/api/assets/logo/${logo.id}`,
            usage: {
                siteLogoActive: siteRow?.logoImageId === logo.id,
                googleButtonActive: siteRow?.googleButtonLogoId === logo.id,
                albumCount: albumMap.get(logo.id) ?? 0,
                groupCount: groupMap.get(logo.id) ?? 0,
            },
        })),
    }
})
