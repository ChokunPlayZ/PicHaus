import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const userId = user.id

    // 1. Basic Counts (Filtered by user)
    const [totalPhotos, totalAlbums] = await Promise.all([
        prisma.photo.count({ where: { uploaderId: userId } }),
        prisma.album.count({ where: { ownerId: userId } }),
    ])

    // 2. Camera & Lens Stats (Existing + Enhanced)
    const [cameraStats, lensStats] = await Promise.all([
        prisma.photo.groupBy({
            by: ['cameraModel'],
            _count: { cameraModel: true },
            orderBy: { _count: { cameraModel: 'desc' } },
            where: { cameraModel: { not: null }, uploaderId: userId },
            take: 10,
        }),
        prisma.photo.groupBy({
            by: ['lens'],
            _count: { lens: true },
            orderBy: { _count: { lens: 'desc' } },
            where: { lens: { not: null }, uploaderId: userId },
            take: 10,
        }),
    ])

    // 3. Technical Specs Stats
    const [apertureStats, isoStats, shutterSpeedStats, focalLengthStats] = await Promise.all([
        prisma.photo.groupBy({
            by: ['aperture'],
            _count: { aperture: true },
            orderBy: { _count: { aperture: 'desc' } },
            where: { aperture: { not: null }, uploaderId: userId },
            take: 5,
        }),
        prisma.photo.groupBy({
            by: ['iso'],
            _count: { iso: true },
            orderBy: { _count: { iso: 'desc' } },
            where: { iso: { not: null }, uploaderId: userId },
            take: 5,
        }),
        prisma.photo.groupBy({
            by: ['shutterSpeed'],
            _count: { shutterSpeed: true },
            orderBy: { _count: { shutterSpeed: 'desc' } },
            where: { shutterSpeed: { not: null }, uploaderId: userId },
            take: 5,
        }),
        prisma.photo.groupBy({
            by: ['focalLength'],
            _count: { focalLength: true },
            orderBy: { _count: { focalLength: 'desc' } },
            where: { focalLength: { not: null }, uploaderId: userId },
            take: 5,
        }),
    ])

    // 4. Time Distribution (Group by Month)
    // Using raw query, securely parameterized or carefully updated to include user filter.
    // Prisma $queryRaw uses strict parameterization if using template literals with variables.
    // However, table names/columns usually can't be variables.
    // "uploaderId" is a string (UUID).

    const photosByMonth = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT TO_CHAR(to_timestamp("dateTaken"), 'YYYY-MM') as date, COUNT(*) as count 
        FROM photos 
        WHERE "dateTaken" IS NOT NULL AND "uploaderId" = ${userId}::uuid
        GROUP BY date 
        ORDER BY date ASC
    `

    // Aggregate Disk Usage
    const storageStats = await prisma.photo.aggregate({
        _sum: {
            size: true,
        },
        where: { uploaderId: userId }
    })

    // Format the response
    return {
        totals: {
            photos: totalPhotos,
            albums: totalAlbums,
        },
        cameras: cameraStats.map((stat) => ({
            model: stat.cameraModel,
            count: stat._count.cameraModel,
        })),
        lenses: lensStats.map((stat) => ({
            model: stat.lens,
            count: stat._count.lens,
        })),
        technical: {
            aperture: apertureStats.map(s => ({ value: s.aperture, count: s._count.aperture })),
            iso: isoStats.map(s => ({ value: s.iso, count: s._count.iso })),
            shutterSpeed: shutterSpeedStats.map(s => ({ value: s.shutterSpeed, count: s._count.shutterSpeed })),
            focalLength: focalLengthStats.map(s => ({ value: s.focalLength, count: s._count.focalLength })),
        },
        timeline: photosByMonth.map(s => ({
            date: s.date,
            count: Number(s.count), // bigint to number
        })),
        storage: {
            totalBytes: storageStats._sum.size || 0,
        },
    }
})
