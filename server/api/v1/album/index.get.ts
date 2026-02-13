import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
    try {
        const albums = await prisma.$queryRaw`
            SELECT
                a.id,
                a.title,
                a.description,
                a."eventDate",
                a."isPublic",
                a."createdAt",
                a."updatedAt",
                u.id as "ownerId",
                u.name as "ownerName",
                u.instagram as "ownerInstagram",
                (SELECT COUNT(*)::int FROM photos p WHERE p."albumId" = a.id) as "photoCount",
                (SELECT COUNT(*)::int FROM album_collaborators ac WHERE ac."albumId" = a.id) as "collaboratorCount",
                COALESCE(
                    (
                        SELECT json_build_object('id', p.id, 'blurhash', p.blurhash)
                        FROM photos p
                        WHERE p.id = a."coverPhotoId"
                    ),
                    (
                        SELECT json_build_object('id', p.id, 'blurhash', p.blurhash)
                        FROM photos p
                        WHERE p."albumId" = a.id
                        ORDER BY
                            CASE WHEN p.width >= p.height THEN 1 ELSE 0 END DESC,
                            p."createdAt" DESC
                        LIMIT 1
                    )
                ) as "coverPhoto"
            FROM albums a
            JOIN users u ON a."ownerId" = u.id
            ORDER BY a."createdAt" DESC
        ` as any[]

        return {
            success: true,
            data: albums.map((album) => ({
                id: album.id,
                name: album.title,
                description: album.description,
                isPublic: album.isPublic,
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                owner: {
                    id: album.ownerId,
                    name: album.ownerName,
                    instagram: album.ownerInstagram,
                },
                _count: {
                    photos: album.photoCount,
                    collaborators: album.collaboratorCount,
                },
                coverPhoto: album.coverPhoto,
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
