import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const albums = await prisma.album.findMany({
        where: { ownerId: user.id },
        select: {
            id: true,
            title: true,
            description: true,
            _count: {
                select: { photos: true }
            },
            photos: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    blurhash: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return {
        success: true,
        data: albums.map(album => ({
            id: album.id,
            name: album.title,
            description: album.description,
            photoCount: album._count.photos,
            coverPhoto: album.photos[0] ? {
                id: album.photos[0].id,
                blurhash: album.photos[0].blurhash
            } : null
        }))
    }
})
