import { and, eq, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const albumId = getRouterParam(event, 'id')
    if (!albumId) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })
    const album = await db.query.albums.findFirst({ where: eq(albums.id, albumId) })
    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (album.ownerId !== user.id) {
        const collaborator = await db.query.albumCollaborators.findFirst({
            where: and(eq(albumCollaborators.albumId, albumId), eq(albumCollaborators.userId, user.id), inArray(albumCollaborators.role, ['admin', 'editor'])),
        })
        if (!collaborator) throw createError({ statusCode: 403, statusMessage: 'You do not have permission to view upload progress' })
    }

    const idsParam = getQuery(event).ids
    const ids = typeof idsParam === 'string' ? idsParam.split(',') : []
    if (!ids.length || ids.length > 100 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
        throw createError({ statusCode: 400, statusMessage: 'Provide between 1 and 100 photo IDs' })
    }
    setHeader(event, 'Cache-Control', 'private, no-store')
    const data = await db.select({ id: photos.id, processingStatus: photos.processingStatus })
        .from(photos).where(and(eq(photos.albumId, albumId), inArray(photos.id, ids)))
    return { success: true, data }
})
