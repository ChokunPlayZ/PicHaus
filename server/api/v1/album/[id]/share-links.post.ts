import { eq } from 'drizzle-orm'
import { albums, shareLinks } from '../../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../../utils/auth'
import { nanoid } from 'nanoid'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const albumId = getRouterParam(event, 'id')
    const body = await readBody(event)

    const album = await db.query.albums.findFirst({ where: eq(albums.id, albumId!), columns: { ownerId: true } })
    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (album.ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const type = body.type || 'view'
    const label = body.label || null
    const password = body.password || null
    const passwordHash = password ? await argon2.hash(password) : null
    const token = nanoid(32)
    const faceSearchEnabled = body.faceSearchEnabled !== undefined ? !!body.faceSearchEnabled : false

    const [link] = await db.insert(shareLinks).values({
        token,
        type,
        label,
        password: passwordHash,
        showMetadata: body.showMetadata !== undefined ? !!body.showMetadata : false,
        faceSearchEnabled,
        uploadMessage: type === 'upload' ? (body.uploadMessage || null) : null,
        albumId: albumId!,
        createdAt: getUnixTimestamp(),
    }).returning()

    if (!link) throw createError({ statusCode: 500, statusMessage: 'Failed to create share link' })

    return {
        success: true,
        data: { ...link, createdAt: Number(link.createdAt), expiresAt: link.expiresAt ? Number(link.expiresAt) : null },
    }
})
