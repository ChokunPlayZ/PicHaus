import { eq, inArray } from 'drizzle-orm'
import { photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)

        const photoIds = Array.isArray(body.photoIds)
            ? body.photoIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : []

        if (photoIds.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'At least one photo ID is required' })
        }

        const mode = body.mode || 'offset'

        if (mode === 'sequence') {
            const startTime = Number(body.startTime)
            const interval = Number(body.interval)

            if (isNaN(startTime)) {
                throw createError({ statusCode: 400, statusMessage: 'Start time must be a valid number' })
            }
            if (isNaN(interval)) {
                throw createError({ statusCode: 400, statusMessage: 'Interval must be a valid number' })
            }

            // Fetch photos and check their album context to verify permissions
            const photoRows = await db.query.photos.findMany({
                where: inArray(photos.id, photoIds),
                with: { album: { with: { collaborators: true } } },
            })

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
            const editableMap = new Map(editablePhotos.map(p => [p.id, p]))

            // Update dates in order of photoIds array to assign correct sequential times
            await db.transaction(async (tx) => {
                for (let i = 0; i < photoIds.length; i++) {
                    const id = photoIds[i]
                    const photo = editableMap.get(id)
                    if (!photo) continue // Skip if photo is not authorized

                    const newVal = startTime + i * interval
                    await tx.update(photos).set({
                        dateTaken: BigInt(newVal),
                        updatedAt: BigInt(nowSeconds),
                    }).where(eq(photos.id, photo.id))
                }
            })

            // Fetch updated photos
            const updatedPhotoIds = editablePhotos.map(p => p.id)
            const updatedPhotosFromDb = await db.query.photos.findMany({
                where: inArray(photos.id, updatedPhotoIds)
            })

            const mappedUpdatedPhotos = updatedPhotosFromDb.map(p => ({
                id: p.id,
                dateTaken: p.dateTaken ? Number(p.dateTaken) : null,
                updatedAt: Number(p.updatedAt)
            }))

            return {
                success: true,
                message: `Successfully set sequential timestamps for ${editablePhotos.length} photos.`,
                data: {
                    updatedPhotos: mappedUpdatedPhotos
                }
            }
        } else {
            // Offset Mode (Drift adjustment)
            const offset = Number(body.offset)

            if (isNaN(offset)) {
                throw createError({ statusCode: 400, statusMessage: 'Offset must be a valid number' })
            }

            // Fetch photos and check their album context to verify permissions
            const photoRows = await db.query.photos.findMany({
                where: inArray(photos.id, photoIds),
                with: { album: { with: { collaborators: true } } },
            })

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

            await db.transaction(async (tx) => {
                for (const photo of editablePhotos) {
                    const currentVal = photo.dateTaken ? Number(photo.dateTaken) : Number(photo.createdAt)
                    const newVal = currentVal + offset
                    await tx.update(photos).set({
                        dateTaken: BigInt(newVal),
                        updatedAt: BigInt(nowSeconds),
                    }).where(eq(photos.id, photo.id))
                }
            })

            const updatedPhotoIds = editablePhotos.map(p => p.id)
            const updatedPhotosFromDb = await db.query.photos.findMany({
                where: inArray(photos.id, updatedPhotoIds)
            })

            const mappedUpdatedPhotos = updatedPhotosFromDb.map(p => ({
                id: p.id,
                dateTaken: p.dateTaken ? Number(p.dateTaken) : null,
                updatedAt: Number(p.updatedAt)
            }))

            return {
                success: true,
                message: `Successfully adjusted timestamp for ${editablePhotos.length} photos.`,
                data: {
                    updatedPhotos: mappedUpdatedPhotos
                }
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to batch adjust photo timestamps' })
    }
})
