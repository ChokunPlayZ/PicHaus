import { eq } from 'drizzle-orm'
import { siteSettings } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

    const body = await readBody(event)
    const { siteName, accentColor, logoImageId, allowRegistration } = body

    if (siteName !== undefined && (typeof siteName !== 'string' || siteName.trim().length === 0)) {
        throw createError({ statusCode: 400, statusMessage: 'siteName must be a non-empty string' })
    }

    if (accentColor !== undefined && accentColor !== null) {
        if (typeof accentColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
            throw createError({ statusCode: 400, statusMessage: 'accentColor must be a hex color like #0071e3' })
        }
    }

    const update: Record<string, unknown> = { updatedAt: BigInt(Math.floor(Date.now() / 1000)) }
    if (siteName !== undefined) update.siteName = siteName.trim()
    if (accentColor !== undefined) update.accentColor = accentColor || null
    if (logoImageId !== undefined) update.logoImageId = logoImageId || null
    if (allowRegistration !== undefined) update.allowRegistration = Boolean(allowRegistration)

    // Upsert: try update first, insert if no row exists
    const existing = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.id, 1)).limit(1)
    if (existing.length > 0) {
        await db.update(siteSettings).set(update).where(eq(siteSettings.id, 1))
    } else {
        await db.insert(siteSettings).values({
            id: 1,
            siteName: (update.siteName as string) ?? 'PicHaus',
            accentColor: (update.accentColor as string | null) ?? null,
            logoImageId: (update.logoImageId as string | null) ?? null,
            allowRegistration: (update.allowRegistration as boolean) ?? false,
            updatedAt: update.updatedAt as bigint,
        })
    }

    return { success: true }
})
