import { eq } from 'drizzle-orm'
import { photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const id = getRouterParam(event, 'id')
        const body = await readBody(event)

        if (!id) throw createError({ statusCode: 400, statusMessage: 'Photo ID required' })

        const photo = await db.query.photos.findFirst({
            where: eq(photos.id, id),
            with: { album: { with: { collaborators: true } } },
        })

        if (!photo) throw createError({ statusCode: 404, statusMessage: 'Photo not found' })

        const isOwner = photo.album.ownerId === user.id
        const isCollaborator = photo.album.collaborators.some(c => c.userId === user.id && c.role !== 'viewer')
        const isAdmin = user.role === 'ADMIN'
        if (!isOwner && !isCollaborator && !isAdmin) throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

        const [updatedPhoto] = await db.update(photos).set({
            dateTaken: body.dateTaken ? BigInt(body.dateTaken) : undefined,
            cameraModel: body.cameraModel,
            lens: body.lens,
            focalLength: body.focalLength,
            aperture: body.aperture,
            shutterSpeed: body.shutterSpeed,
            iso: body.iso ? Number(body.iso) : undefined,
        }).where(eq(photos.id, id)).returning()

        return {
            success: true,
            data: {
                ...updatedPhoto,
                dateTaken: updatedPhoto.dateTaken ? Number(updatedPhoto.dateTaken) : null,
                createdAt: Number(updatedPhoto.createdAt),
                updatedAt: Number(updatedPhoto.updatedAt),
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update photo' })
    }
})
