import { eq, and, asc, desc, sql } from 'drizzle-orm'
import { albums, photos, users } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID required' })

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, id),
        with: { owner: { columns: { id: true, name: true, email: true, instagram: true, avatarPath: true } } },
        columns: { id: true, isPublic: true },
    })

    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (!album.isPublic) throw createError({ statusCode: 403, statusMessage: 'This album is not public' })

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit
    const photographer = query.photographer as string | undefined

    const sort = (query.sort as string) || 'dateTaken'
    const order = (query.order as string) || 'asc'

    let orderByItems = []
    if (sort === 'dateTaken') {
        orderByItems = [
            order === 'desc' ? desc(photos.dateTaken) : asc(photos.dateTaken),
            order === 'desc' ? desc(photos.createdAt) : asc(photos.createdAt),
        ]
    } else {
        orderByItems = [
            order === 'desc' ? desc(photos.dateTaken) : asc(photos.dateTaken),
            order === 'desc' ? desc(photos.createdAt) : asc(photos.createdAt),
        ]
    }

    const photoWhere = and(
        eq(photos.albumId, id),
        photographer ? eq(photos.uploaderId, photographer) : undefined
    )

    const [photoRows, countResult, uploaderRows] = await Promise.all([
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
            uploaderAvatarPath: users.avatarPath,
        })
            .from(photos)
            .leftJoin(users, eq(photos.uploaderId, users.id))
            .where(photoWhere)
            .orderBy(...orderByItems)
            .limit(limit)
            .offset(skip),
        db.select({ total: sql<number>`COUNT(*)` })
            .from(photos)
            .where(photoWhere),
        db.selectDistinctOn([photos.uploaderId], {
            id: users.id,
            name: users.name,
            instagram: users.instagram,
            avatarPath: users.avatarPath,
        })
            .from(photos)
            .innerJoin(users, eq(photos.uploaderId, users.id))
            .where(eq(photos.albumId, id)),
    ])

    const total = Number(countResult[0]?.total ?? 0)

    return {
        success: true,
        data: {
            owner: album.owner ? {
                ...album.owner,
                avatar: album.owner.avatarPath ? `/api/assets/avatar/${album.owner.id}` : null,
            } : null,
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
                uploader: p.uploaderId ? {
                    id: p.uploaderId,
                    name: p.uploaderName,
                    instagram: p.uploaderInstagram,
                    avatar: p.uploaderAvatarPath ? `/api/assets/avatar/${p.uploaderId}` : null,
                } : null,
            })),
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + photoRows.length < total,
            },
            uploaders: uploaderRows.map(u => ({
                id: u.id,
                name: u.name,
                instagram: u.instagram,
                avatar: u.avatarPath ? `/api/assets/avatar/${u.id}` : null,
            })).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        },
    }
})
