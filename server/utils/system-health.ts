import { sql } from 'drizzle-orm'
import { MIGRATIONS } from '../db/migrations'
import { checkStorageWritable } from './storage'

export const OUT_OF_ORDER_MESSAGE = 'Out of Order, Contact Instance Owner, for more info check logs.'

type SystemOutage = {
    reason: string
    error?: unknown
    detectedAt: number
}

declare const globalThis: {
    _pichausOutage?: SystemOutage
    _pichausLastHealthCheck?: number
} & typeof global

const HEALTH_CHECK_INTERVAL_MS = 2000

const REQUIRED_TABLES = [
    'users',
    'albums',
    'photos',
    'passkeys',
    'share_groups',
    'share_links',
    'album_collaborators',
    'api_tokens',
    'invite_tokens',
    'logos',
    'site_settings',
    '_AlbumToShareGroup',
]

const REQUIRED_COLUMNS: Record<string, string[]> = {
    users: ['id', 'email', 'passwordHash', 'createdAt', 'updatedAt', 'role', 'avatarPath', 'googleId', 'microsoftId', 'themePreference'],
    albums: ['id', 'title', 'createdAt', 'updatedAt', 'ownerId', 'themePreset', 'customTheme', 'logoText', 'logoImageId'],
    photos: ['id', 'filename', 'storagePath', 'thumbnailStoragePath', 'blurhash', 'size', 'albumId'],
    share_groups: ['id', 'title', 'createdAt', 'updatedAt', 'ownerId', 'themePreset', 'customTheme', 'logoText', 'logoImageId', 'tags'],
    share_links: ['id', 'token', 'type', 'views', 'createdAt', 'showMetadata', 'faceSearchEnabled', 'uploadMessage', 'albumId', 'shareGroupId'],
    invite_tokens: ['id', 'token', 'type', 'expiresAt', 'createdAt'],
    logos: ['id', 'storagePath', 'originalName', 'mimeType', 'uploadedAt'],
    site_settings: ['id', 'siteName', 'updatedAt', 'allowRegistration', 'googleOAuthEnabled', 'microsoftOAuthEnabled'],
}

function sqlList(values: string[]) {
    return sql.join(values.map(value => sql`${value}`), sql`, `)
}

export function getSystemOutage() {
    return globalThis._pichausOutage
}

export function markSystemOutage(reason: string, error?: unknown) {
    if (!globalThis._pichausOutage) {
        globalThis._pichausOutage = { reason, error, detectedAt: Date.now() }
    }

    console.error(`[system] Out of order: ${reason}`)
    if (error) console.error(error)
}

export async function assertSystemHealthy() {
    if (globalThis._pichausOutage) return

    const now = Date.now()
    if (globalThis._pichausLastHealthCheck && now - globalThis._pichausLastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
        return
    }

    globalThis._pichausLastHealthCheck = now

    try {
        await validateSystemHealth()
    } catch (error: any) {
        markSystemOutage(error?.message || 'System health check failed', error)
    }
}

export async function validateStartupSetup() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not configured')
    }

    const storageHealth = await checkStorageWritable()
    if (!storageHealth.ok) {
        throw new Error(`Storage is not writable at ${storageHealth.location}: ${storageHealth.error || 'unknown error'}`)
    }
}

export async function validateSystemHealth() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not configured')
    }

    await db.execute(sql`SELECT 1`)
    await validateRequiredSchema()
    await validateMigrationsApplied()
}

async function validateRequiredSchema() {
    const tableRows = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (${sqlList(REQUIRED_TABLES)})
    `) as { table_name: string }[]

    const existingTables = new Set(tableRows.map(row => row.table_name))
    const missingTables = REQUIRED_TABLES.filter(table => !existingTables.has(table))
    if (missingTables.length > 0) {
        throw new Error(`Missing required database table(s): ${missingTables.join(', ')}`)
    }

    const columnRows = await db.execute(sql`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (${sqlList(Object.keys(REQUIRED_COLUMNS))})
    `) as { table_name: string, column_name: string }[]

    const columnsByTable = new Map<string, Set<string>>()
    for (const row of columnRows) {
        const columns = columnsByTable.get(row.table_name) ?? new Set<string>()
        columns.add(row.column_name)
        columnsByTable.set(row.table_name, columns)
    }

    const missingColumns = Object.entries(REQUIRED_COLUMNS).flatMap(([table, columns]) => {
        const existingColumns = columnsByTable.get(table) ?? new Set<string>()
        return columns
            .filter(column => !existingColumns.has(column))
            .map(column => `${table}.${column}`)
    })

    if (missingColumns.length > 0) {
        throw new Error(`Missing required database column(s): ${missingColumns.join(', ')}`)
    }
}

async function validateMigrationsApplied() {
    const rows = await db.execute(sql`
        SELECT name FROM __pichaus_migrations
    `) as { name: string }[]

    const applied = new Set(rows.map(row => row.name))
    const missingMigrations = MIGRATIONS
        .map(migration => migration.name)
        .filter(name => !applied.has(name))

    if (missingMigrations.length > 0) {
        throw new Error(`Missing applied migration record(s): ${missingMigrations.join(', ')}`)
    }
}
