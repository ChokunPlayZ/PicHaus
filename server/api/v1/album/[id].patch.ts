import { eq } from 'drizzle-orm'
import { albums, users } from '../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../utils/auth'
import { requireRouterParamValue } from '../../../utils/api'
import { assertAlbumOwnerWithEmail, avatarUrl, normalizeTags, serializeAlbum } from '../../../utils/albums'

export default defineEventHandler(async (event) => {
    try {
        const id = requireRouterParamValue(event, 'id', 'Album ID')

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        assertAlbumOwnerWithEmail(album, user, 'edit')

        const body = await readBody(event)
        const now = getUnixTimestamp()

        const [updatedAlbum] = await db.update(albums).set({
            title: body.name ?? album.title,
            description: body.description !== undefined ? body.description : album.description,
            tags: body.tags !== undefined ? normalizeTags(body.tags) : album.tags,
            eventDate: body.eventDate !== undefined
                ? (body.eventDate ? BigInt(body.eventDate) : null)
                : album.eventDate,
            isPublic: body.isPublic ?? album.isPublic,
            themePreset: body.themePreset !== undefined ? (body.themePreset || null) : album.themePreset,
            customTheme: body.customTheme !== undefined ? (body.customTheme || null) : album.customTheme,
            logoText: body.logoText !== undefined ? (body.logoText || null) : album.logoText,
            logoImageId: body.logoImageId !== undefined ? (body.logoImageId || null) : album.logoImageId,
            updatedAt: now,
        }).where(eq(albums.id, id)).returning()

        if (!updatedAlbum) throw createError({ statusCode: 500, statusMessage: 'Failed to update album' })

        const owner = await db.query.users.findFirst({ where: eq(users.id, updatedAlbum.ownerId), columns: { id: true, name: true, avatarPath: true } })

        return {
            success: true,
            message: 'Album updated successfully',
            data: {
                ...serializeAlbum(updatedAlbum),
                owner: owner ? {
                    ...owner,
                    avatar: avatarUrl(owner),
                } : null,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update album' })
    }
})
