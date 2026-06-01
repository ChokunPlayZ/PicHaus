import { sql } from 'drizzle-orm'

export default defineNitroPlugin(async () => {
    // Create migration-tracking table only if it doesn't already exist.
    // Avoids a PostgreSQL NOTICE (code 42P07) that can surface as an error
    // in some driver configurations when using CREATE TABLE IF NOT EXISTS.
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

    // Get all bundled migration files in sorted order
    const storage = useStorage('assets:migrations')
    const allNames = (await storage.getKeys())
        .filter(k => k.endsWith('.sql'))
        .sort()

    console.log(`[db] Found ${allNames.length} migration file(s):`, allNames)

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

    console.log(`[db] usersExists=${usersExists} trackedCount=${trackedCount}`)

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

    // Apply any pending migrations in order.
    // Statements are split individually because postgres.js does not support
    // multiple statements in a single query call.
    let applied = 0
    for (const name of allNames) {
        const [existing] = await db.execute(sql`
            SELECT id FROM __pichaus_migrations WHERE name = ${name}
        `) as any[]
        if (existing) {
            console.log(`[db] Already applied: ${name}`)
            continue
        }

        const content = await storage.getItem(name) as string | null
        if (!content) {
            console.error(`[db] Could not read migration file: ${name}`)
            process.exit(1)
        }

        // Split on semicolons outside of $$ blocks so each statement runs separately
        const statements = content
            .replace(/--[^\n]*/g, '')       // strip line comments
            .split(/;\s*\n|;\s*$/)           // split on ; followed by newline or end
            .map(s => s.trim())
            .filter(s => s.length > 0)

        try {
            console.log(`[db] Applying migration: ${name} (${statements.length} statement(s))`)
            for (const stmt of statements) {
                await db.execute(sql.raw(stmt))
            }
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
