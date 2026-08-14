import { eq, desc } from 'drizzle-orm'
import { faces, people, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Photo ID is required' })

    const user = await requireAuth(event)
    const photo = await db.query.photos.findFirst({
        where: eq(photos.id, id),
        with: { album: { with: { collaborators: true } } },
    })
    if (!photo) throw createError({ statusCode: 404, statusMessage: 'Photo not found' })

    const isOwner = photo.album.ownerId === user.id
    const isCollaborator = photo.album.collaborators.some(c => c.userId === user.id)
    if (!isOwner && !isCollaborator && !photo.album.isPublic) {
        throw createError({ statusCode: 403, statusMessage: 'You do not have permission to view this photo' })
    }

    const rows = await db.select({
        id: faces.id,
        personId: faces.personId,
        personName: people.name,
        x1: faces.x1,
        y1: faces.y1,
        x2: faces.x2,
        y2: faces.y2,
        score: faces.score,
        createdAt: faces.createdAt,
    })
        .from(faces)
        .leftJoin(people, eq(faces.personId, people.id))
        .where(eq(faces.photoId, id))
        .orderBy(desc(faces.createdAt))

    return {
        success: true,
        data: rows.map(row => ({
            ...row,
            createdAt: Number(row.createdAt),
        })),
    }
})
