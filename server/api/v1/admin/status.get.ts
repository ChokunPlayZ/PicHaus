import { eq, count, sum, sql } from 'drizzle-orm'
import { users, albums, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { access, constants } from 'fs/promises'

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
    const storageDir = process.env.STORAGE_DIR || 'storage/uploads'
    let storageOk = false
    let storageError: string | null = null
    let storageSizeBytes = 0
    try {
        await access(storageDir, constants.W_OK)
        storageOk = true
    } catch (err: any) {
        storageError = err?.code === 'ENOENT' ? 'Directory does not exist' : 'Not writable'
    }

    // ── Quick stats ───────────────────────────────────────────────────────────
    let stats = { users: 0, albums: 0, photos: 0, storageMb: 0 }
    if (dbOk) {
        try {
            const [[u], [a], [p], [s]] = await Promise.all([
                db.select({ value: count() }).from(users),
                db.select({ value: count() }).from(albums),
                db.select({ value: count() }).from(photos),
                db.select({ value: sum(photos.size) }).from(photos),
            ])
            stats = {
                users: u.value,
                albums: a.value,
                photos: p.value,
                storageMb: Math.round(Number(s.value ?? 0) / 1024 / 1024),
            }
        } catch {}
    }

    return {
        success: true,
        data: {
            database: { ok: dbOk, latencyMs: dbLatencyMs, error: dbError },
            storage: { ok: storageOk, path: storageDir, error: storageError },
            migrations: { applied: migrations.length, list: migrations },
            stats,
        },
    }
})
