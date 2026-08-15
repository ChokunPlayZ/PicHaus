import { eq, and } from 'drizzle-orm'
import { people, faces, photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Person ID is required' })

    const user = await requireAuth(event)
    const person = await db.query.people.findFirst({ where: eq(people.id, id) })
    if (!person) throw createError({ statusCode: 404, statusMessage: 'Person not found' })

    if (user.role !== 'ADMIN') {
        const ownedAlbum = await db.select({ id: albums.id })
            .from(albums)
            .innerJoin(photos, eq(photos.albumId, albums.id))
            .innerJoin(faces, eq(faces.photoId, photos.id))
            .where(and(
                eq(faces.personId, id),
                eq(albums.ownerId, user.id),
            ))
            .limit(1)

        if (ownedAlbum.length === 0) {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }
    }

    const body = await readBody(event)
    const updateData: Partial<typeof people.$inferInsert> = {
        updatedAt: BigInt(Math.floor(Date.now() / 1000)),
    }

    if (body?.name !== undefined) {
        if (typeof body.name !== 'string') {
            throw createError({ statusCode: 400, statusMessage: 'name must be a string' })
        }
        updateData.name = body.name.trim() || null
    }

    if (body?.instagram !== undefined) {
        if (body.instagram === null) {
            updateData.instagram = null
        } else {
            if (typeof body.instagram !== 'string') {
                throw createError({ statusCode: 400, statusMessage: 'instagram must be a string' })
            }
            // Normalize: strip leading @, whitespace, and URL prefixes.
            const raw = body.instagram.trim()
            const cleaned = raw
                .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
                .replace(/^@/, '')
                .replace(/\/.*$/, '')
                .trim()
            if (cleaned.length > 0 && !/^[a-zA-Z0-9._]{1,30}$/.test(cleaned)) {
                throw createError({ statusCode: 400, statusMessage: 'Instagram handle contains invalid characters' })
            }
            updateData.instagram = cleaned || null
        }
    }

    if (body?.representativeFaceId !== undefined) {
        if (body.representativeFaceId === null) {
            updateData.representativeFaceId = null
        } else {
            if (typeof body.representativeFaceId !== 'string') {
                throw createError({ statusCode: 400, statusMessage: 'representativeFaceId must be a string' })
            }
            const face = await db.query.faces.findFirst({
                where: and(eq(faces.id, body.representativeFaceId), eq(faces.personId, id)),
            })
            if (!face) {
                throw createError({ statusCode: 400, statusMessage: 'Representative face must belong to this person' })
            }
            updateData.representativeFaceId = body.representativeFaceId
        }
    }

    if (Object.keys(updateData).length <= 1) {
        throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
    }

    const [updated] = await db.update(people).set(updateData).where(eq(people.id, id)).returning()
    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Person not found' })

    return {
        success: true,
        data: {
            ...updated,
            createdAt: Number(updated.createdAt),
            updatedAt: Number(updated.updatedAt),
            representativeFaceUrl: updated.representativeFaceId
                ? `/api/v1/faces/${updated.representativeFaceId}/thumb`
                : null,
        },
    }
})
