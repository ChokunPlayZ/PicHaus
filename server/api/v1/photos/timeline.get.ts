import { defineEventHandler, getQuery } from 'h3'
import { eq, and, desc, sql, count, isNotNull, notInArray } from 'drizzle-orm'
import { photos, users, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

// Max plausible Unix timestamp in seconds (year 9999)
const MAX_UNIX_SECONDS = 253402300000n

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const query = getQuery(event)

    const mode = (query.mode as string) || 'months'

    const userFilter = eq(photos.uploaderId, user.id)

    // Fetch cover photo IDs to exclude from all timeline views
    const coverAlbumRows = await db.select({ coverPhotoId: albums.coverPhotoId })
        .from(albums)
        .where(and(eq(albums.ownerId, user.id), isNotNull(albums.coverPhotoId)))
    const coverPhotoIds = coverAlbumRows.map(r => r.coverPhotoId).filter(Boolean) as string[]
    const coverExclusionSQL = coverPhotoIds.length > 0
        ? sql`AND photos.id NOT IN (${sql.join(coverPhotoIds.map(id => sql`${id}::uuid`), sql`, `)})`
        : sql``

    if (mode === 'months') {
        // Normalize dateTaken: if stored in milliseconds (> MAX_UNIX_SECONDS) divide by 1000
        // createdAt fallback is always in ms so always divide by 1000
        // Both dateTaken and createdAt are qualified with table name to avoid ambiguity
        const rows = await db.execute(sql`
            SELECT
                to_char(
                    to_timestamp(
                        COALESCE(
                            CASE WHEN CAST(photos."dateTaken" AS BIGINT) > ${MAX_UNIX_SECONDS}
                                THEN CAST(photos."dateTaken" AS BIGINT) / 1000
                                ELSE CAST(photos."dateTaken" AS BIGINT)
                            END,
                            photos."createdAt" / 1000
                        )
                    ),
                    'YYYY-MM'
                ) AS month_key,
                to_char(
                    to_timestamp(
                        COALESCE(
                            CASE WHEN CAST(photos."dateTaken" AS BIGINT) > ${MAX_UNIX_SECONDS}
                                THEN CAST(photos."dateTaken" AS BIGINT) / 1000
                                ELSE CAST(photos."dateTaken" AS BIGINT)
                            END,
                            photos."createdAt" / 1000
                        )
                    ),
                    'Mon YYYY'
                ) AS month_label,
                COUNT(*) AS count,
                MIN(
                    COALESCE(
                        CASE WHEN CAST(photos."dateTaken" AS BIGINT) > ${MAX_UNIX_SECONDS}
                            THEN CAST(photos."dateTaken" AS BIGINT) / 1000
                            ELSE CAST(photos."dateTaken" AS BIGINT)
                        END,
                        photos."createdAt" / 1000
                    )
                ) AS earliest_ts
            FROM photos
            WHERE photos."uploaderId" = ${user.id}
            ${coverExclusionSQL}
            GROUP BY month_key, month_label
            ORDER BY month_key DESC
        `)

        return {
            months: (rows as any[]).map(r => ({
                key: r.month_key,
                label: r.month_label,
                count: Number(r.count),
                earliestTs: Number(r.earliest_ts),
            }))
        }
    }

    // Mode: 'photos' — fetch photos for a specific YYYY-MM
    const monthKey = (query.month as string)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit

    const conditions: any[] = [userFilter]

    // Exclude cover photos from the per-month photo grid
    if (coverPhotoIds.length > 0) {
        conditions.push(notInArray(photos.id, coverPhotoIds))
    }

    if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
        const [year, month] = monthKey.split('-').map(Number)
        const start = new Date(year!, month! - 1, 1)
        const end = new Date(year!, month!, 1)
        const startTs = BigInt(Math.floor(start.getTime() / 1000))
        const endTs = BigInt(Math.floor(end.getTime() / 1000))

        // Normalize dateTaken for comparison; createdAt fallback is in ms so divide by 1000
        conditions.push(
            sql`COALESCE(
                CASE WHEN CAST(photos."dateTaken" AS BIGINT) > ${MAX_UNIX_SECONDS}
                    THEN CAST(photos."dateTaken" AS BIGINT) / 1000
                    ELSE CAST(photos."dateTaken" AS BIGINT)
                END,
                photos."createdAt" / 1000
            ) >= ${startTs}`,
            sql`COALESCE(
                CASE WHEN CAST(photos."dateTaken" AS BIGINT) > ${MAX_UNIX_SECONDS}
                    THEN CAST(photos."dateTaken" AS BIGINT) / 1000
                    ELSE CAST(photos."dateTaken" AS BIGINT)
                END,
                photos."createdAt" / 1000
            ) < ${endTs}`,
        )
    }

    const where = and(...conditions)

    const [rows, countResult] = await Promise.all([
        db.select({
            id: photos.id,
            filename: photos.filename,
            originalName: photos.originalName,
            blurhash: photos.blurhash,
            size: photos.size,
            width: photos.width,
            height: photos.height,
            mimeType: photos.mimeType,
            cameraModel: photos.cameraModel,
            lens: photos.lens,
            focalLength: photos.focalLength,
            iso: photos.iso,
            aperture: photos.aperture,
            shutterSpeed: photos.shutterSpeed,
            dateTaken: photos.dateTaken,
            createdAt: photos.createdAt,
            updatedAt: photos.updatedAt,
            albumId: photos.albumId,
            uploaderId: photos.uploaderId,
            uploaderName: users.name,
            uploaderInstagram: users.instagram,
        })
            .from(photos)
            .leftJoin(users, eq(photos.uploaderId, users.id))
            .where(where)
            .orderBy(desc(sql`COALESCE(
                CASE WHEN CAST(photos."dateTaken" AS BIGINT) > ${MAX_UNIX_SECONDS}
                    THEN CAST(photos."dateTaken" AS BIGINT) / 1000
                    ELSE CAST(photos."dateTaken" AS BIGINT)
                END,
                photos."createdAt"
            )`))
            .limit(limit)
            .offset(skip),
        db.select({ total: count() }).from(photos).where(where),
    ])

    const total = countResult[0]?.total ?? 0

    const serializedPhotos = rows.map(p => ({
        ...p,
        dateTaken: p.dateTaken ? Number(p.dateTaken) : null,
        createdAt: Number(p.createdAt),
        updatedAt: Number(p.updatedAt),
        uploader: p.uploaderId
            ? { name: p.uploaderName, instagram: p.uploaderInstagram ?? null }
            : null,
    }))

    return {
        photos: serializedPhotos,
        pagination: { page, limit, total, hasMore: skip + rows.length < total },
    }
})
