import { eq, count, sum, sql } from 'drizzle-orm'
import { users, albums, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { checkStorageWritable, getStorageDriver } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    // ── Database ─────────────────────────────────────────────────────────────
    let dbOk = false
    let dbLatencyMs = 0
    let dbError: string | null = null
    try {
        const t0 = Date.now()
        await db.execute(sql`SELECT 1`)
        dbLatencyMs = Date.now() - t0
        dbOk = true
    } catch (err: any) {
        dbError = err?.message ?? 'Unknown error'
    }

    // ── Migrations ────────────────────────────────────────────────────────────
    let migrations: { name: string; appliedAt: number }[] = []
    try {
        const rows = await db.execute(sql`
            SELECT name, applied_at FROM __pichaus_migrations ORDER BY name ASC
        `) as { name: string; applied_at: string | bigint }[]
        migrations = rows.map(r => ({
            name: r.name,
            appliedAt: Number(r.applied_at),
        }))
    } catch {
        // table might not exist on very fresh install before first boot
    }

    // ── Storage ───────────────────────────────────────────────────────────────
    const storageHealth = await checkStorageWritable()

    // ── Quick stats ───────────────────────────────────────────────────────────
    let stats = { users: 0, albums: 0, photos: 0, storageMb: 0 }
    if (dbOk) {
        try {
            const [uRes, aRes, pRes, sRes] = await Promise.all([
                db.select({ value: count() }).from(users),
                db.select({ value: count() }).from(albums),
                db.select({ value: count() }).from(photos),
                db.select({ value: sum(photos.size) }).from(photos),
            ])
            stats = {
                users: uRes[0]?.value ?? 0,
                albums: aRes[0]?.value ?? 0,
                photos: pRes[0]?.value ?? 0,
                storageMb: Math.round(Number(sRes[0]?.value ?? 0) / 1024 / 1024),
            }
        } catch {}
    }

    return {
        success: true,
        data: {
            database: { ok: dbOk, latencyMs: dbLatencyMs, error: dbError },
            storage: {
                ok: storageHealth.ok,
                driver: getStorageDriver(),
                path: storageHealth.location,
                error: storageHealth.error,
            },
            migrations: { applied: migrations.length, list: migrations },
            stats,
        },
    }
})
