import { sql } from 'drizzle-orm'
import { MIGRATIONS } from '../db/migrations'
import { markSystemOutage, validateStartupSetup, validateSystemHealth } from '../utils/system-health'

export default defineNitroPlugin(async () => {
    console.log(String.raw`
 ____  _      _   _                 
|  _ \(_) ___| | | | __ _ _   _ ___ 
| |_) | |/ __| |_| |/ _\` | | | / __|
|  __/| | (__|  _  | (_| | |_| \__ \
|_|   |_|\___|_| |_|\__,_|\__,_|___/
`)

    try {
        await validateStartupSetup()

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

        const tableExists = async (tableName: string): Promise<boolean> => {
            const [{ exists }] = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = ${tableName}
                ) AS "exists"
            `) as any[]
            return exists
        }

        // Apply any pending migrations in order.
        // All statements use IF NOT EXISTS / EXCEPTION WHEN duplicate so they are
        // safe to run against an existing schema.
        let applied = 0
        for (const migration of MIGRATIONS) {
            const [existing] = await db.execute(sql`
                SELECT id FROM __pichaus_migrations WHERE name = ${migration.name}
            `) as any[]

            let shouldRun = !existing
            if (existing) {
                // Check if key tables created by the migration are actually present in the database.
                // If they are missing, run the migration to restore them.
                if (migration.name === '0000_initial_schema.sql') {
                    const exists = await tableExists('users')
                    if (!exists) {
                        console.log(`[db] Table "users" is missing despite migration "${migration.name}" marked as applied. Re-running migration statements...`)
                        shouldRun = true
                    }
                } else if (migration.name === '0001_invite_tokens.sql') {
                    const exists = await tableExists('invite_tokens')
                    if (!exists) {
                        console.log(`[db] Table "invite_tokens" is missing despite migration "${migration.name}" marked as applied. Re-running migration statements...`)
                        shouldRun = true
                    }
                } else if (migration.name === '0004_custom_theme_logos.sql') {
                    const exists = await tableExists('logos')
                    if (!exists) {
                        console.log(`[db] Table "logos" is missing despite migration "${migration.name}" marked as applied. Re-running migration statements...`)
                        shouldRun = true
                    }
                } else if (migration.name === '0008_site_settings.sql') {
                    const exists = await tableExists('site_settings')
                    if (!exists) {
                        console.log(`[db] Table "site_settings" is missing despite migration "${migration.name}" marked as applied. Re-running migration statements...`)
                        shouldRun = true
                    }
                }
            }

            if (!shouldRun) continue

            console.log(`[db] Applying migration: ${migration.name} (${migration.statements.length} statement(s))`)
            for (const stmt of migration.statements) {
                await db.execute(sql.raw(stmt))
            }
            if (!existing) {
                await db.execute(sql`
                    INSERT INTO __pichaus_migrations (name, applied_at)
                    VALUES (${migration.name}, ${BigInt(Date.now())})
                `)
            }
            applied++
        }

        await validateSystemHealth()

        if (applied > 0) {
            console.log(`[db] Applied ${applied} migration(s)`)
        }
    } catch (err) {
        markSystemOutage('Startup setup or database validation failed', err)
    }
})
