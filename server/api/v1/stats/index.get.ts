import { defineEventHandler } from 'h3'
import { eq, and, isNotNull, notInArray, count, sum, sql, desc } from 'drizzle-orm'
import { photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const userId = user.id

    // Filter by albums owned by the user (not uploaderId, which is the photographer/guest)
    const ownedAlbum = eq(albums.ownerId, userId)

    // Collect all cover photo IDs for this user's albums so they can be excluded from stats
    const coverAlbumRows = await db.select({ coverPhotoId: albums.coverPhotoId })
        .from(albums)
        .where(and(eq(albums.ownerId, userId), isNotNull(albums.coverPhotoId)))
    const coverPhotoIds = coverAlbumRows.map(r => r.coverPhotoId).filter(Boolean) as string[]
    const notACover = coverPhotoIds.length > 0 ? notInArray(photos.id, coverPhotoIds) : undefined

    const [totalPhotos, totalAlbums] = await Promise.all([
        db.select({ value: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(ownedAlbum, notACover)),
        db.select({ value: count() }).from(albums).where(ownedAlbum),
    ])

    const [cameraStats, lensStats] = await Promise.all([
        db.select({ model: photos.cameraModel, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.cameraModel), ownedAlbum, notACover))
            .groupBy(photos.cameraModel)
            .orderBy(desc(count()))
            .limit(10),
        db.select({ model: photos.lens, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.lens), ownedAlbum, notACover))
            .groupBy(photos.lens)
            .orderBy(desc(count()))
            .limit(10),
    ])

    const [apertureStats, isoStats, shutterSpeedStats, focalLengthStats] = await Promise.all([
        db.select({ value: photos.aperture, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.aperture), ownedAlbum, notACover))
            .groupBy(photos.aperture)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.iso, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.iso), ownedAlbum, notACover))
            .groupBy(photos.iso)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.shutterSpeed, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.shutterSpeed), ownedAlbum, notACover))
            .groupBy(photos.shutterSpeed)
            .orderBy(desc(count()))
            .limit(5),
        db.select({ value: photos.focalLength, count: count() })
            .from(photos)
            .innerJoin(albums, eq(photos.albumId, albums.id))
            .where(and(isNotNull(photos.focalLength), ownedAlbum, notACover))
            .groupBy(photos.focalLength)
            .orderBy(desc(count()))
            .limit(5),
    ])

    // coverPhotoIds as a SQL literal array for the raw query exclusion
    const coverExclusionClause = coverPhotoIds.length > 0
        ? sql`AND p.id NOT IN (${sql.join(coverPhotoIds.map(id => sql`${id}::uuid`), sql`, `)})`
        : sql``

    const photosByMonth = await db.execute(sql`
        SELECT TO_CHAR(
            to_timestamp(
                CASE
                    WHEN p."dateTaken" IS NOT NULL THEN p."dateTaken"
                    ELSE p."createdAt" / 1000
                END
            ), 'YYYY-MM'
        ) as date, COUNT(*) as count
        FROM photos p
        INNER JOIN albums a ON p."albumId" = a.id
        WHERE a."ownerId" = ${userId}::uuid
        ${coverExclusionClause}
        GROUP BY date
        ORDER BY date ASC
    `) as { date: string; count: string }[]

    const [storageStats] = await db.select({ total: sum(photos.size) })
        .from(photos)
        .innerJoin(albums, eq(photos.albumId, albums.id))
        .where(and(ownedAlbum, notACover))

    const totalPhotosCount = totalPhotos[0]?.value ?? 0
    const totalAlbumsCount = totalAlbums[0]?.value ?? 0
    const totalBytes = storageStats?.total ? Number(storageStats.total) : 0

    return {
        totals: { photos: Number(totalPhotosCount), albums: Number(totalAlbumsCount) },
        cameras: cameraStats.map(s => ({ model: s.model, count: Number(s.count) })),
        lenses: lensStats.map(s => ({ model: s.model, count: Number(s.count) })),
        technical: {
            aperture: apertureStats.map(s => ({ value: s.value, count: Number(s.count) })),
            iso: isoStats.map(s => ({ value: s.value, count: Number(s.count) })),
            shutterSpeed: shutterSpeedStats.map(s => ({ value: s.value, count: Number(s.count) })),
            focalLength: focalLengthStats.map(s => ({ value: s.value, count: Number(s.count) })),
        },
        timeline: photosByMonth.map(s => ({ date: s.date, count: Number(s.count) })),
        storage: { totalBytes },
    }
})
