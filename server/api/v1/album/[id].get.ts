import { eq, and, or, desc, ilike, sql, inArray } from 'drizzle-orm'
import { albums, photos, users, albumCollaborators, shareLinks, shareGroups, albumToShareGroups } from '../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const authUserId = getAuthUserId(event)
        const now = getUnixTimestamp()

        const query = getQuery(event)
        const page = Math.max(1, Number(query.page) || 1)
        const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
        const skip = (page - 1) * limit

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
            with: {
                owner: { columns: { id: true, name: true, email: true, instagram: true } },
                collaborators: { with: { user: { columns: { id: true, name: true, email: true, instagram: true } } } },
                coverPhoto: { columns: { id: true, blurhash: true } },
            },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

        const isOwner = authUserId === album.ownerId
        const collaborator = album.collaborators.find(c => c.userId === authUserId)
        const isCollaborator = !!collaborator
        const canEditAsCollaborator = !!collaborator && collaborator.role !== 'viewer'
        let hasShareLinkAccess = false

        if (!album.isPublic && !isOwner && !isCollaborator) {
            const shareToken = getCookie(event, `album-access-${id}`)
            if (shareToken) {
                const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
                if (link && link.albumId === id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasShareLinkAccess = true
                }
            }

            if (!hasShareLinkAccess) {
                const groups = await db.select({ id: shareGroups.id })
                    .from(shareGroups)
                    .innerJoin(albumToShareGroups, and(
                        eq(albumToShareGroups.B, shareGroups.id),
                        eq(albumToShareGroups.A, id),
                    ))

                for (const group of groups) {
                    const groupToken = getCookie(event, `group-access-${group.id}`)
                    if (groupToken) {
                        const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, groupToken) })
                        if (link && link.shareGroupId === group.id && (!link.expiresAt || link.expiresAt >= now)) {
                            hasShareLinkAccess = true
                            break
                        }
                    }
                }
            }
        }

        if (!album.isPublic && !isOwner && !isCollaborator && !hasShareLinkAccess) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to view this album' })
        }

        const camera = query.camera as string | undefined
        const lens = query.lens as string | undefined
        const photographer = query.photographer as string | undefined

        const photoWhere = and(
            eq(photos.albumId, id),
            album.coverPhotoId ? sql`${photos.id} != ${album.coverPhotoId}::uuid` : undefined,
            camera ? ilike(photos.cameraModel, `%${camera}%`) : undefined,
            lens ? ilike(photos.lens, `%${lens}%`) : undefined,
            photographer ? eq(photos.uploaderId, photographer) : undefined,
        )

        const [photoRows, [{ total }]] = await Promise.all([
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
                .where(photoWhere)
                .orderBy(desc(photos.dateTaken), desc(photos.createdAt))
                .limit(limit)
                .offset(skip),
            db.select({ total: sql<number>`COUNT(*)` }).from(photos).where(photoWhere),
        ])

        const mappedPhotos = photoRows.map(photo => ({
            id: photo.id,
            filename: photo.filename,
            originalName: photo.originalName,
            size: photo.size,
            blurhash: photo.blurhash,
            dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
            createdAt: Number(photo.createdAt),
            width: photo.width,
            height: photo.height,
            cameraModel: photo.cameraModel,
            lens: photo.lens,
            focalLength: photo.focalLength,
            aperture: photo.aperture,
            shutterSpeed: photo.shutterSpeed,
            iso: photo.iso,
            uploader: photo.uploaderId ? { id: photo.uploaderId, name: photo.uploaderName, instagram: photo.uploaderInstagram } : null,
        }))

        const collaborators = album.collaborators.map(collab => ({
            ...collab,
            createdAt: Number(collab.createdAt),
        }))

        let coverPhoto: { id: string; blurhash: string } | null = album.coverPhoto ?? null
        if (!coverPhoto) {
            const [fallback] = await db.execute(sql`
                SELECT id, blurhash
                FROM photos
                WHERE "albumId" = ${id}::uuid
                ORDER BY CASE WHEN width >= height THEN 1 ELSE 0 END DESC, "createdAt" DESC
                LIMIT 1
            `) as any[]
            if (fallback) coverPhoto = fallback
        }

        const totalPhotos = Number(total)

        return {
            success: true,
            data: {
                ...album,
                coverPhoto,
                name: album.title,
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                photos: mappedPhotos,
                collaborators,
                permissions: {
                    isOwner,
                    isCollaborator,
                    canEdit: isOwner || canEditAsCollaborator,
                    canDelete: isOwner,
                },
                pagination: { page, limit, total: totalPhotos, hasMore: skip + photoRows.length < totalPhotos },
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch album' })
    }
})
