import { defineEventHandler } from 'h3'
import { eq, and, isNotNull, count, sum, sql, desc } from 'drizzle-orm'
import { photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const userId = user.id

    // Filter by albums owned by the user (not uploaderId, which is the photographer/guest)
    const ownedAlbum = eq(albums.ownerId, userId)

    const [totalPhotos, totalAlbums] = await Promise.all([
        db.select({ value: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(ownedAlbum),
        db.select({ value: count() }).from(albums).where(ownedAlbum),
    ])

    const [cameraStats, lensStats] = await Promise.all([
        db.select({ model: photos.cameraModel, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.cameraModel), ownedAlbum))
            .groupBy(photos.cameraModel)
            .orderBy(desc(count()))
            .limit(10),
        db.select({ model: photos.lens, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.lens), ownedAlbum))
            .groupBy(photos.lens)
            .orderBy(desc(count()))
            .limit(10),
    ])

    const [apertureStats, isoStats, shutterSpeedStats, focalLengthStats] = await Promise.all([
        db.select({ value: photos.aperture, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.aperture), ownedAlbum))
            .groupBy(photos.aperture)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.iso, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.iso), ownedAlbum))
            .groupBy(photos.iso)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.shutterSpeed, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.shutterSpeed), ownedAlbum))
            .groupBy(photos.shutterSpeed)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.focalLength, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.focalLength), ownedAlbum))
            .groupBy(photos.focalLength)
            .orderBy(desc(count()))
            .limit(5),
    ])

    const photosByMonth = await db.execute(sql`
        SELECT TO_CHAR(to_timestamp(COALESCE(p."dateTaken", p."createdAt")), 'YYYY-MM') as date, COUNT(*) as count
        FROM photos p
        INNER JOIN albums a ON p."albumId" = a.id
        WHERE a."ownerId" = ${userId}::uuid
        GROUP BY date
        ORDER BY date ASC
    `) as { date: string; count: string }[]

    const [storageStats] = await db.select({ total: sum(photos.size) })
        .from(photos)
        .innerJoin(albums, eq(photos.albumId, albums.id))
        .where(ownedAlbum)

    return {
        totals: { photos: Number(totalPhotos[0].value), albums: Number(totalAlbums[0].value) },
        cameras: cameraStats.map(s => ({ model: s.model, count: Number(s.count) })),
        lenses: lensStats.map(s => ({ model: s.model, count: Number(s.count) })),
        technical: {
            aperture: apertureStats.map(s => ({ value: s.value, count: Number(s.count) })),
            iso: isoStats.map(s => ({ value: s.value, count: Number(s.count) })),
            shutterSpeed: shutterSpeedStats.map(s => ({ value: s.value, count: Number(s.count) })),
            focalLength: focalLengthStats.map(s => ({ value: s.value, count: Number(s.count) })),
        },
        timeline: photosByMonth.map(s => ({ date: s.date, count: Number(s.count) })),
        storage: { totalBytes: Number(storageStats.total ?? 0) },
    }
})
