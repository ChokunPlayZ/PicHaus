import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, users } from '../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../utils/auth'

const normalizeTags = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const normalized = value.map(tag => (typeof tag === 'string' ? tag.trim() : '')).filter(tag => tag.length > 0)
    return Array.from(new Set(normalized))
}

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
            with: { collaborators: { where: and(eq(albumCollaborators.userId, user.id), inArray(albumCollaborators.role, ['admin', 'editor'])) } },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

        const isOwner = album.ownerId === user.id
        if (!isOwner && album.collaborators.length === 0) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to edit this album' })
        }

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
            updatedAt: now,
        }).where(eq(albums.id, id)).returning()

        const owner = await db.query.users.findFirst({ where: eq(users.id, updatedAlbum.ownerId), columns: { id: true, name: true } })

        return {
            success: true,
            message: 'Album updated successfully',
            data: {
                ...updatedAlbum,
                name: updatedAlbum.title,
                createdAt: Number(updatedAlbum.createdAt),
                updatedAt: Number(updatedAlbum.updatedAt),
                eventDate: updatedAlbum.eventDate ? Number(updatedAlbum.eventDate) : null,
                owner,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update album' })
    }
})
