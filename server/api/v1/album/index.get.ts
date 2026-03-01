import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        const where = user.role === 'ADMIN'
            ? {}
            : {
                OR: [
                    { ownerId: user.id },
                    { collaborators: { some: { userId: user.id } } },
                ],
            }

        const albums = await prisma.album.findMany({
            where,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        instagram: true,
                    },
                },
                _count: {
                    select: {
                        photos: true,
                        collaborators: true,
                    },
                },
                coverPhoto: {
                    select: {
                        id: true,
                        blurhash: true,
                    },
                },
                photos: {
                    take: 1,
                    orderBy: [
                        { createdAt: 'desc' }
                    ],
                    select: {
                        id: true,
                        blurhash: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return {
            success: true,
            data: albums.map((album: any) => ({
                id: album.id,
                name: album.title,
                description: album.description,
                tags: album.tags,
                isPublic: album.isPublic,
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                owner: {
                    id: album.owner.id,
                    name: album.owner.name,
                    instagram: album.owner.instagram,
                },
                _count: {
                    photos: album._count.photos,
                    collaborators: album._count.collaborators,
                },
                coverPhoto: album.coverPhoto || album.photos[0] || null,
            })),
        }
    } catch (error) {
        console.error('Error fetching albums:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch albums',
        })
    }
})
