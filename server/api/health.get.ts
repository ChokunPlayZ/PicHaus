import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
    try {
        await db.execute(sql`SELECT 1`)
    } catch (err: any) {
        throw createError({
            statusCode: 503,
            statusMessage: 'Database unavailable',
        })
    }

    return { ok: true, uptime: Math.floor(process.uptime()) }
})
