import { eq, desc, sql } from 'drizzle-orm'
import { albums, photos, users } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID required' })

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, id),
        with: { owner: { columns: { id: true, name: true, email: true, instagram: true } } },
        columns: { id: true, isPublic: true },
    })

    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (!album.isPublic) throw createError({ statusCode: 403, statusMessage: 'This album is not public' })

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit

    const [photoRows, countResult] = await Promise.all([
        db.select({
            id: photos.id,
            filename: photos.filename,
            originalName: photos.originalName,
            size: photos.size,
            blurhash: photos.blurhash,
            dateTaken: photos.dateTaken,
            createdAt: photos.createdAt,
            width: photos.width,
            height: photos.height,
            cameraModel: photos.cameraModel,
            lens: photos.lens,
            focalLength: photos.focalLength,
            aperture: photos.aperture,
            shutterSpeed: photos.shutterSpeed,
            iso: photos.iso,
            uploaderId: photos.uploaderId,
            uploaderName: users.name,
            uploaderInstagram: users.instagram,
        })
            .from(photos)
            .leftJoin(users, eq(photos.uploaderId, users.id))
            .where(eq(photos.albumId, id))
            .orderBy(desc(photos.dateTaken), desc(photos.createdAt))
            .limit(limit)
            .offset(skip),
        db.select({ total: sql<number>`COUNT(*)` })
            .from(photos)
            .where(eq(photos.albumId, id)),
    ])

    const total = Number(countResult[0]?.total ?? 0)

    return {
        success: true,
        data: {
            owner: album.owner,
            photos: photoRows.map(p => ({
                id: p.id,
                filename: p.filename,
                originalName: p.originalName,
                size: p.size,
                blurhash: p.blurhash,
                dateTaken: p.dateTaken ? Number(p.dateTaken) : null,
                createdAt: Number(p.createdAt),
                width: p.width,
                height: p.height,
                cameraModel: p.cameraModel,
                lens: p.lens,
                focalLength: p.focalLength,
                aperture: p.aperture,
                shutterSpeed: p.shutterSpeed,
                iso: p.iso,
                uploader: p.uploaderId ? { id: p.uploaderId, name: p.uploaderName, instagram: p.uploaderInstagram } : null,
            })),
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + photoRows.length < total,
            },
        },
    }
})
