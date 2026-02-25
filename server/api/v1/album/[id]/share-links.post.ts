import prisma from '../../../../utils/prisma'
import { requireAuth, getUnixTimestamp } from '../../../../utils/auth'
import { nanoid } from 'nanoid'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const albumId = getRouterParam(event, 'id')
    const body = await readBody(event)

    const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { ownerId: true }
    })

    if (!album) {
        throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    }

    if (album.ownerId !== user.id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const type = body.type || 'view' // view, upload
    const label = body.label || null
    const password = body.password || null

    let passwordHash = null
    if (password) {
        passwordHash = await argon2.hash(password)
    }

    const token = nanoid(32)

    const link = await prisma.shareLink.create({
        data: {
            token,
            type,
            label,
            password: passwordHash,
            showMetadata: body.showMetadata !== undefined ? body.showMetadata : true,
            albumId: albumId!,
            createdAt: getUnixTimestamp(),
        }
    })

    return {
        success: true,
        data: {
            ...link,
            createdAt: Number(link.createdAt),
            expiresAt: link.expiresAt ? Number(link.expiresAt) : null
        }
    }
})
