import { sql } from 'drizzle-orm'

export default defineNitroPlugin(async () => {
    // Create our migration-tracking table first (idempotent)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS __pichaus_migrations (
            id         SERIAL  PRIMARY KEY,
            name       TEXT    NOT NULL UNIQUE,
            applied_at BIGINT  NOT NULL
        )
    `)

    // Get all bundled migration files in sorted order
    const storage = useStorage('assets:migrations')
    const allNames = (await storage.getKeys())
        .filter(k => k.endsWith('.sql'))
        .sort()

    if (allNames.length === 0) return

    // Detect existing installation: users table exists but we've never tracked migrations.
    // This means the DB was previously managed by Prisma — stamp all files as applied
    // without executing them (the schema is already correct).
    const [[{ usersExists }], [{ trackedCount }]] = await Promise.all([
        db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'users'
            ) AS "usersExists"
        `) as Promise<any[]>,
        db.execute(sql`
            SELECT COUNT(*) AS "trackedCount" FROM __pichaus_migrations
        `) as Promise<any[]>,
    ])

    if (usersExists && Number(trackedCount) === 0) {
        console.log('[db] Existing installation detected — marking migrations as applied')
        for (const name of allNames) {
            await db.execute(sql`
                INSERT INTO __pichaus_migrations (name, applied_at)
                VALUES (${name}, ${BigInt(Date.now())})
                ON CONFLICT (name) DO NOTHING
            `)
        }
        console.log(`[db] Stamped ${allNames.length} migration(s) ✓`)
        return
    }

    // Apply any pending migrations in order
    let applied = 0
    for (const name of allNames) {
        const [existing] = await db.execute(sql`
            SELECT id FROM __pichaus_migrations WHERE name = ${name}
        `) as any[]
        if (existing) continue

        const content = await storage.getItem(name) as string | null
        if (!content) {
            console.error(`[db] Could not read migration file: ${name}`)
            process.exit(1)
        }

        try {
            console.log(`[db] Applying migration: ${name}`)
            await db.execute(sql.raw(content))
            await db.execute(sql`
                INSERT INTO __pichaus_migrations (name, applied_at)
                VALUES (${name}, ${BigInt(Date.now())})
            `)
            applied++
        } catch (err) {
            console.error(`[db] Migration failed: ${name}`)
            console.error(err)
            process.exit(1)
        }
    }

    if (applied > 0) {
        console.log(`[db] Applied ${applied} migration(s) ✓`)
    }
})
