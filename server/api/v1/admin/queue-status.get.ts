import { sql } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAuth } from '../../../utils/auth'
import { getQueueStats } from '../../../utils/queue'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const stats = await getQueueStats()

    const rows = await db.execute(sql`
        SELECT id, type, error, attempts, "updatedAt"
        FROM jobs
        WHERE status = 'failed'
        ORDER BY "updatedAt" DESC
        LIMIT 20
    `) as { id: string; type: string; error: string | null; attempts: number | string; updatedAt: number | string }[]

    return {
        success: true,
        data: {
            stats,
            recentFailed: rows.map(row => ({
                id: row.id,
                type: row.type,
                error: row.error,
                attempts: Number(row.attempts),
                updatedAt: Number(row.updatedAt),
            })),
        },
    }
})
