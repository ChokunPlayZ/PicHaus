import { desc } from 'drizzle-orm'
import { logos } from '../../../db/schema'
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

    return {
        success: true,
        data: rows.map(logo => ({
            ...logo,
            uploadedAt: Number(logo.uploadedAt),
            url: `/api/assets/logo/${logo.id}`,
        })),
    }
})
