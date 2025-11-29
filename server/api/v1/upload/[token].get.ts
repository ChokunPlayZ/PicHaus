import prisma from '../../../utils/prisma'

/**
 * Validate upload token and get album info
 */
export default defineEventHandler(async (event) => {
    try {
        const token = getRouterParam(event, 'token')

        if (!token) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Upload token is required',
            })
        }

        // Find album by upload link token
        const album = await prisma.album.findUnique({
            where: { uploadLink: token },
            select: {
                id: true,
                title: true,
                description: true,
                eventDate: true,
                uploadPassword: true,
                owner: {
                    select: {
                        name: true,
                    },
                },
                _count: {
                    select: {
                        photos: true,
                    },
                },
            },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Upload link not found or expired',
            })
        }

        return {
            success: true,
            data: {
                albumId: album.id,
                albumName: album.title,
                description: album.description,
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                ownerName: album.owner.name,
                photoCount: album._count.photos,
                requiresPassword: !!album.uploadPassword,
            },
        }
    } catch (error: any) {
        console.error('Error validating upload token:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to validate upload link',
        })
    }
})
