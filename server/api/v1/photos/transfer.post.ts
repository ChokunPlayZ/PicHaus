import { eq, inArray } from 'drizzle-orm'
import { photos, users } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)

        const photoIds = Array.isArray(body.photoIds)
            ? body.photoIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : []
        const targetUploaderId = body.targetUploaderId as string | undefined

        if (photoIds.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'At least one photo ID is required' })
        }
        if (!targetUploaderId) {
            throw createError({ statusCode: 400, statusMessage: 'Target photographer ID is required' })
        }

        // Verify target photographer exists in the system
        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, targetUploaderId),
            columns: { id: true, name: true, instagram: true, avatarPath: true }
        })
        if (!targetUser) {
            throw createError({ statusCode: 404, statusMessage: 'Target photographer not found' })
        }

        // Fetch photos and check their album context to verify edit permissions
        const photoRows = await db.query.photos.findMany({
            where: inArray(photos.id, photoIds),
            with: { album: { with: { collaborators: true } } },
        })

        // Filters photos the user is authorized to edit:
        // - Admin user
        // - Album owner
        // - Album collaborator (non-viewer role) who is also the uploader of the photo
        const editablePhotos = photoRows.filter(photo => {
            const isOwner = photo.album.ownerId === user.id
            const isUploader = photo.uploaderId === user.id
            const isCollaborator = photo.album.collaborators.some(c => c.userId === user.id && c.role !== 'viewer')
            const isAdmin = user.role === 'ADMIN'
            return isOwner || isAdmin || (isCollaborator && isUploader)
        })

        if (editablePhotos.length === 0) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to modify any of the selected photos' })
        }

        const nowSeconds = Math.floor(Date.now() / 1000)
        const editableIds = editablePhotos.map(p => p.id)

        // Perform the bulk transfer in the database
        await db.update(photos)
            .set({
                uploaderId: targetUser.id,
                updatedAt: BigInt(nowSeconds),
            })
            .where(inArray(photos.id, editableIds))

        return {
            success: true,
            message: `Successfully transferred ${editableIds.length} photos to ${targetUser.name || 'new photographer'}.`,
            data: {
                targetUploader: {
                    id: targetUser.id,
                    name: targetUser.name,
                    instagram: targetUser.instagram,
                    avatar: targetUser.avatarPath ? `/api/assets/avatar/${targetUser.id}` : null,
                },
                transferredPhotoIds: editableIds,
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to transfer photos uploader' })
    }
})
