import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
    try {
        const albums = await prisma.album.findMany({
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
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return {
            success: true,
            data: albums.map((album: any) => ({
                ...album,
                name: album.title, // Map title to name for frontend
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
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
