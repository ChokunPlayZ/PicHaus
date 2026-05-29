import { defineEventHandler, getQuery, createError } from 'h3'
import { eq, and, asc, desc, gte, lte, ilike, sql, count } from 'drizzle-orm'
import { photos, users } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

const SORTABLE_FIELDS = ['dateTaken', 'createdAt', 'updatedAt', 'iso'] as const
type SortableField = typeof SORTABLE_FIELDS[number]

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit

    const camera = query.camera as string
    const lens = query.lens as string
    const iso = query.iso ? Number(query.iso) : undefined
    const aperture = query.aperture as string
    const shutterSpeed = query.shutterSpeed as string
    const dateFrom = query.dateFrom as string
    const dateTo = query.dateTo as string
    const sortInput = (query.sort as string) || 'dateTaken'
    const orderInput = ((query.order as string) || 'desc').toLowerCase()
    const sort: SortableField = SORTABLE_FIELDS.includes(sortInput as SortableField) ? sortInput as SortableField : 'dateTaken'
    const orderFn = orderInput === 'asc' ? asc : desc

    const conditions = [
        eq(photos.uploaderId, user.id),
        camera ? ilike(photos.cameraModel, `%${camera}%`) : undefined,
        lens ? ilike(photos.lens, `%${lens}%`) : undefined,
        iso ? eq(photos.iso, iso) : undefined,
        aperture ? ilike(photos.aperture, `%${aperture}%`) : undefined,
        shutterSpeed ? ilike(photos.shutterSpeed, `%${shutterSpeed}%`) : undefined,
    ].filter(Boolean)

    if (dateFrom) {
        const parsedFrom = Date.parse(dateFrom)
        if (!Number.isFinite(parsedFrom)) throw createError({ statusCode: 400, statusMessage: 'Invalid dateFrom value' })
        conditions.push(gte(photos.dateTaken, BigInt(Math.floor(parsedFrom / 1000))))
    }
    if (dateTo) {
        const parsedTo = Date.parse(dateTo)
        if (!Number.isFinite(parsedTo)) throw createError({ statusCode: 400, statusMessage: 'Invalid dateTo value' })
        conditions.push(lte(photos.dateTaken, BigInt(Math.floor(parsedTo / 1000))))
    }

    const where = and(...(conditions as any[]))

    const [rows, [{ total }]] = await Promise.all([
        db.select({
            id: photos.id,
            filename: photos.filename,
            originalName: photos.originalName,
            storagePath: photos.storagePath,
            thumbnailStoragePath: photos.thumbnailStoragePath,
            blurhash: photos.blurhash,
            size: photos.size,
            width: photos.width,
            height: photos.height,
            mimeType: photos.mimeType,
            fileHash: photos.fileHash,
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
            uploaderEmail: users.email,
            uploaderInstagram: users.instagram,
        })
            .from(photos)
            .leftJoin(users, eq(photos.uploaderId, users.id))
            .where(where)
            .orderBy(orderFn(photos[sort]))
            .limit(limit)
            .offset(skip),
        db.select({ total: count() }).from(photos).where(where),
    ])

    const serializedPhotos = rows.map(p => ({
        ...p,
        dateTaken: p.dateTaken ? Number(p.dateTaken) : null,
        createdAt: Number(p.createdAt),
        updatedAt: Number(p.updatedAt),
        uploader: p.uploaderId ? { id: p.uploaderId, name: p.uploaderName, email: p.uploaderEmail, instagram: p.uploaderInstagram } : null,
    }))

    return {
        photos: serializedPhotos,
        pagination: { page, limit, total, hasMore: skip + rows.length < total },
    }
})
