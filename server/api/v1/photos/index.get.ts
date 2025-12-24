import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 50
    const skip = (page - 1) * limit

    // Filters
    const camera = query.camera as string
    const lens = query.lens as string
    const iso = query.iso ? Number(query.iso) : undefined
    const aperture = query.aperture as string
    const shutterSpeed = query.shutterSpeed as string
    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string
    const sort = (query.sort as string) || 'dateTaken'
    const order = (query.order as string) || 'desc'

    const where: Prisma.PhotoWhereInput = {}

    if (camera) where.cameraModel = camera
    if (lens) where.lens = lens
    if (iso) where.iso = iso
    if (aperture) where.aperture = aperture
    if (shutterSpeed) where.shutterSpeed = shutterSpeed

    if (dateFrom || dateTo) {
        where.dateTaken = {}
        if (dateFrom) where.dateTaken.gte = BigInt(new Date(dateFrom).getTime())
        if (dateTo) where.dateTaken.lte = BigInt(new Date(dateTo).getTime())
    }

    // Get photos
    const [photos, total] = await Promise.all([
        prisma.photo.findMany({
            where,
            orderBy: {
                [sort]: order,
            },
            take: limit,
            skip,
            include: {
                uploader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        instagram: true,
                    }
                }
            }
        }),
        prisma.photo.count({ where }),
    ])

    // Convert BigInt to number for JSON serialization
    const serializedPhotos = photos.map(p => ({
        ...p,
        dateTaken: p.dateTaken ? Number(p.dateTaken) : null,
        createdAt: Number(p.createdAt),
        updatedAt: Number(p.updatedAt),
    }))

    return {
        photos: serializedPhotos,
        pagination: {
            page,
            limit,
            total,
            hasMore: skip + photos.length < total,
        },
    }
})
