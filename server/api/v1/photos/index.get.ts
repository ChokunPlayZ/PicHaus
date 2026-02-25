import { defineEventHandler, getQuery, createError } from 'h3'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../../../utils/auth'
import prisma from '../../../utils/prisma'

const SORTABLE_FIELDS: Array<keyof Prisma.PhotoOrderByWithRelationInput> = ['dateTaken', 'createdAt', 'updatedAt', 'iso']

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit

    // Filters
    const camera = query.camera as string
    const lens = query.lens as string
    const iso = query.iso ? Number(query.iso) : undefined
    const aperture = query.aperture as string
    const shutterSpeed = query.shutterSpeed as string
    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string
    const sortInput = (query.sort as string) || 'dateTaken'
    const orderInput = ((query.order as string) || 'desc').toLowerCase()
    const sort = SORTABLE_FIELDS.includes(sortInput as keyof Prisma.PhotoOrderByWithRelationInput)
        ? (sortInput as keyof Prisma.PhotoOrderByWithRelationInput)
        : 'dateTaken'
    const order: Prisma.SortOrder = orderInput === 'asc' ? 'asc' : 'desc'

    // Enforce User Isolation
    const where: Prisma.PhotoWhereInput = {
        uploaderId: user.id
    }

    if (camera) where.cameraModel = camera
    if (lens) where.lens = lens
    if (iso) where.iso = iso
    if (aperture) where.aperture = aperture
    if (shutterSpeed) where.shutterSpeed = shutterSpeed

    if (dateFrom || dateTo) {
        where.dateTaken = {}
        if (dateFrom) {
            const parsedFrom = Date.parse(dateFrom)
            if (!Number.isFinite(parsedFrom)) {
                throw createError({ statusCode: 400, statusMessage: 'Invalid dateFrom value' })
            }
            where.dateTaken.gte = BigInt(Math.floor(parsedFrom / 1000))
        }
        if (dateTo) {
            const parsedTo = Date.parse(dateTo)
            if (!Number.isFinite(parsedTo)) {
                throw createError({ statusCode: 400, statusMessage: 'Invalid dateTo value' })
            }
            where.dateTaken.lte = BigInt(Math.floor(parsedTo / 1000))
        }
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
