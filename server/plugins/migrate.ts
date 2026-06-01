import { sql } from 'drizzle-orm'
import { MIGRATIONS } from '../db/migrations'

export default defineNitroPlugin(async () => {
    const [{ trackingExists }] = await db.execute(sql`
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '__pichaus_migrations'
        ) AS "trackingExists"
    `) as any[]

    if (!trackingExists) {
        await db.execute(sql`
            CREATE TABLE __pichaus_migrations (
                id         SERIAL  PRIMARY KEY,
                name       TEXT    NOT NULL UNIQUE,
                applied_at BIGINT  NOT NULL
            )
        `)
    }

    // Apply any pending migrations in order.
    // All statements use IF NOT EXISTS / EXCEPTION WHEN duplicate so they are
    // safe to run against an existing schema.
    let applied = 0
    for (const migration of MIGRATIONS) {
        const [existing] = await db.execute(sql`
            SELECT id FROM __pichaus_migrations WHERE name = ${migration.name}
        `) as any[]
        if (existing) continue

        try {
            console.log(`[db] Applying migration: ${migration.name} (${migration.statements.length} statement(s))`)
            for (const stmt of migration.statements) {
                await db.execute(sql.raw(stmt))
            }
            await db.execute(sql`
                INSERT INTO __pichaus_migrations (name, applied_at)
                VALUES (${migration.name}, ${BigInt(Date.now())})
            `)
            applied++
        } catch (err) {
            console.error(`[db] Migration failed: ${migration.name}`)
            console.error(err)
            process.exit(1)
        }
    }

    if (applied > 0) {
        console.log(`[db] Applied ${applied} migration(s) ✓`)
    }
})
