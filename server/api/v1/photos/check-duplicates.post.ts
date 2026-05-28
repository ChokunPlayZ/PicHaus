import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    // Require authentication
    const user = await requireAuth(event)

    const body = await readBody(event)
    const { hashes } = body

    if (!hashes || !Array.isArray(hashes)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Hashes array is required',
        })
    }

    // Limit batch size
    if (hashes.length > 500) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Batch size too large (max 500)',
        })
    }

    // Collect album IDs this user owns or collaborates on
    const accessibleAlbums = await prisma.album.findMany({
        where: {
            OR: [
                { ownerId: user.id },
                { collaborators: { some: { userId: user.id } } },
            ],
        },
        select: { id: true },
    })
    const albumIds = accessibleAlbums.map(a => a.id)

    const existingPhotos = await prisma.photo.findMany({
        where: {
            fileHash: { in: hashes },
            albumId: { in: albumIds },
        },
        select: { fileHash: true },
        distinct: ['fileHash'],
    })

    const duplicates = existingPhotos.map(p => p.fileHash)

    return {
        success: true,
        duplicates
    }
})
