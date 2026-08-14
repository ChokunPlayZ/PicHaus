import { eq, and, desc, inArray } from 'drizzle-orm'
import { people, faces, photos, albums } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getVisibleAlbumIds } from '../../../utils/people'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Person ID is required' })

    const user = await requireAuth(event)
    const person = await db.query.people.findFirst({ where: eq(people.id, id) })
    if (!person) throw createError({ statusCode: 404, statusMessage: 'Person not found' })

    const visibleAlbumIds = await getVisibleAlbumIds(user.id)
    if (visibleAlbumIds.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Person not found' })
    }

    const faceRows = await db.select({
        id: faces.id,
        photoId: faces.photoId,
        albumId: albums.id,
        x1: faces.x1,
        y1: faces.y1,
        x2: faces.x2,
        y2: faces.y2,
        score: faces.score,
        createdAt: faces.createdAt,
    })
        .from(faces)
        .innerJoin(photos, eq(faces.photoId, photos.id))
        .innerJoin(albums, eq(photos.albumId, albums.id))
        .where(and(
            eq(faces.personId, id),
            inArray(albums.id, visibleAlbumIds),
        ))
        .orderBy(desc(faces.createdAt))

    if (faceRows.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Person not found' })
    }

    return {
        success: true,
        data: {
            person: {
                id: person.id,
                name: person.name,
                representativeFaceId: person.representativeFaceId,
                representativeFaceUrl: person.representativeFaceId
                    ? `/api/v1/faces/${person.representativeFaceId}/thumb`
                    : null,
                faceCount: faceRows.length,
                createdAt: Number(person.createdAt),
                updatedAt: Number(person.updatedAt),
            },
            faces: faceRows.map(face => ({
                ...face,
                score: face.score === null ? null : face.score,
                createdAt: Number(face.createdAt),
            })),
        },
    }
})
