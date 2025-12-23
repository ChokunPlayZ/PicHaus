import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
    // Aggregate Camera Models
    const cameraStats = await prisma.photo.groupBy({
        by: ['cameraModel'],
        _count: {
            cameraModel: true,
        },
        orderBy: {
            _count: {
                cameraModel: 'desc',
            },
        },
        where: {
            cameraModel: {
                not: null,
            },
        },
    })

    // Aggregate Lenses
    const lensStats = await prisma.photo.groupBy({
        by: ['lens'],
        _count: {
            lens: true,
        },
        orderBy: {
            _count: {
                lens: 'desc',
            },
        },
        where: {
            lens: {
                not: null,
            },
        },
    })

    // Aggregate Disk Usage
    const storageStats = await prisma.photo.aggregate({
        _sum: {
            size: true,
        },
    })

    // Format the response
    return {
        cameras: cameraStats.map((stat) => ({
            model: stat.cameraModel,
            count: stat._count.cameraModel,
        })),
        lenses: lensStats.map((stat) => ({
            model: stat.lens,
            count: stat._count.lens,
        })),
        storage: {
            totalBytes: storageStats._sum.size || 0,
        },
    }
})
