import { eq, desc } from 'drizzle-orm'
import { albums, shareLinks } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const albumId = getRouterParam(event, 'id')

    const album = await db.query.albums.findFirst({ where: eq(albums.id, albumId!), columns: { ownerId: true } })
    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (album.ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const links = await db.select().from(shareLinks).where(eq(shareLinks.albumId, albumId!)).orderBy(desc(shareLinks.createdAt))

    return {
        success: true,
        data: links.map(link => ({
            ...link,
            createdAt: Number(link.createdAt),
            expiresAt: link.expiresAt ? Number(link.expiresAt) : null,
        })),
    }
})
