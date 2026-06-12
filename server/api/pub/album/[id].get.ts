import { eq, sql } from 'drizzle-orm'
import { albums, photos } from '../../../db/schema'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID required' })

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, id),
        with: { owner: { columns: { name: true } } },
    })

    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (!album.isPublic) throw createError({ statusCode: 403, statusMessage: 'This album is not public' })

    const countResult = await db.select({ photoCount: sql<number>`COUNT(*)` })
        .from(photos)
        .where(eq(photos.albumId, id))
    const photoCount = Number(countResult[0]?.photoCount ?? 0)

    return {
        success: true,
        data: {
            type: 'album',
            albumId: album.id,
            albumName: album.title,
            description: album.description,
            eventDate: album.eventDate ? Number(album.eventDate) : null,
            ownerName: album.owner.name,
            photoCount,
            requiresPassword: false,
            shareType: 'view',
            showMetadata: true,
            themePreset: album.themePreset,
            customTheme: album.customTheme,
            logoText: album.logoText,
            logoImageId: album.logoImageId,
            isPublicAlbum: true,
        },
    }
})
