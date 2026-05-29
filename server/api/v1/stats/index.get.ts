import { defineEventHandler } from 'h3'
import { eq, and, isNotNull, count, sum, sql, desc } from 'drizzle-orm'
import { photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const userId = user.id

    const [totalPhotos, totalAlbums] = await Promise.all([
        db.select({ value: count() }).from(photos).where(eq(photos.uploaderId, userId)),
        db.select({ value: count() }).from(albums).where(eq(albums.ownerId, userId)),
    ])

    const [cameraStats, lensStats] = await Promise.all([
        db.select({ model: photos.cameraModel, count: count() })
            .from(photos)
            .where(and(isNotNull(photos.cameraModel), eq(photos.uploaderId, userId)))
            .groupBy(photos.cameraModel)
            .orderBy(desc(count()))
            .limit(10),
        db.select({ model: photos.lens, count: count() })
            .from(photos)
            .where(and(isNotNull(photos.lens), eq(photos.uploaderId, userId)))
            .groupBy(photos.lens)
            .orderBy(desc(count()))
            .limit(10),
    ])

    const [apertureStats, isoStats, shutterSpeedStats, focalLengthStats] = await Promise.all([
        db.select({ value: photos.aperture, count: count() })
            .from(photos)
            .where(and(isNotNull(photos.aperture), eq(photos.uploaderId, userId)))
            .groupBy(photos.aperture)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.iso, count: count() })
            .from(photos)
            .where(and(isNotNull(photos.iso), eq(photos.uploaderId, userId)))
            .groupBy(photos.iso)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.shutterSpeed, count: count() })
            .from(photos)
            .where(and(isNotNull(photos.shutterSpeed), eq(photos.uploaderId, userId)))
            .groupBy(photos.shutterSpeed)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.focalLength, count: count() })
            .from(photos)
            .where(and(isNotNull(photos.focalLength), eq(photos.uploaderId, userId)))
            .groupBy(photos.focalLength)
            .orderBy(desc(count()))
            .limit(5),
    ])

    const photosByMonth = await db.execute(sql`
        SELECT TO_CHAR(to_timestamp(COALESCE("dateTaken", "createdAt")), 'YYYY-MM') as date, COUNT(*) as count
        FROM photos
        WHERE "uploaderId" = ${userId}::uuid
        GROUP BY date
        ORDER BY date ASC
    `) as { date: string; count: string }[]

    const [storageStats] = await db.select({ total: sum(photos.size) })
        .from(photos)
        .where(eq(photos.uploaderId, userId))

    return {
        totals: { photos: totalPhotos[0].value, albums: totalAlbums[0].value },
        cameras: cameraStats.map(s => ({ model: s.model, count: s.count })),
        lenses: lensStats.map(s => ({ model: s.model, count: s.count })),
        technical: {
            aperture: apertureStats.map(s => ({ value: s.value, count: s.count })),
            iso: isoStats.map(s => ({ value: s.value, count: s.count })),
            shutterSpeed: shutterSpeedStats.map(s => ({ value: s.value, count: s.count })),
            focalLength: focalLengthStats.map(s => ({ value: s.value, count: s.count })),
        },
        timeline: photosByMonth.map(s => ({ date: s.date, count: Number(s.count) })),
        storage: { totalBytes: storageStats.total || 0 },
    }
})
