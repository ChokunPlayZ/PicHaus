import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'
import sharp from 'sharp'
import { saveFile, generateBlurhash, deleteFile, calculateFileHash } from '../../../../utils/upload'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, 'id')
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Album ID is required' })

        const user = await requireAuth(event)

        const album = await db.query.albums.findFirst({
            where: eq(albums.id, id),
            with: { collaborators: { where: and(eq(albumCollaborators.userId, user.id), inArray(albumCollaborators.role, ['admin', 'editor'])) } },
        })

        if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        if (album.ownerId !== user.id && album.collaborators.length === 0) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to edit this album' })
        }

        const formData = await readMultipartFormData(event)
        if (!formData) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

        const fileData = formData.find(item => item.name === 'file')
        if (!fileData || !fileData.data) throw createError({ statusCode: 400, statusMessage: 'No file data' })

        const buffer = fileData.data
        let processedBuffer = buffer
        try {
            processedBuffer = await sharp(buffer)
                .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
                .toFormat('jpeg', { quality: 90 })
                .toBuffer()
        } catch {
            throw createError({ statusCode: 400, statusMessage: 'Failed to process image' })
        }

        const fileHash = crypto.randomBytes(8).toString('hex')
        const coverFilename = `cover_${id}_${fileHash}.jpg`
        const coverPath = await saveFile(processedBuffer, coverFilename, 'photos')

        let metadata: sharp.Metadata | undefined
        let blurhash = ''
        try {
            metadata = await sharp(processedBuffer).metadata()
            blurhash = await generateBlurhash(processedBuffer)
        } catch {}

        const [coverPhoto] = await db.insert(photos).values({
            id: crypto.randomUUID(),
            filename: coverFilename,
            originalName: `${album.title}_cover.jpg`,
            storagePath: coverPath,
            thumbnailStoragePath: coverPath,
            size: processedBuffer.length,
            width: metadata?.width || 1,
            height: metadata?.height || 1,
            blurhash: blurhash || 'U6PVP-Kh0ffQfQfQfQfQ',
            mimeType: 'image/jpeg',
            fileHash: calculateFileHash(processedBuffer),
            albumId: id,
            uploaderId: user.id,
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
        }).returning()

        // Delete old cover photo
        if (album.coverPhotoId) {
            const oldCover = await db.query.photos.findFirst({ where: eq(photos.id, album.coverPhotoId) })
            if (oldCover) {
                await deleteFile(oldCover.storagePath).catch(err => console.error('Failed to delete old cover file:', err))
                if (oldCover.thumbnailStoragePath && oldCover.thumbnailStoragePath !== oldCover.storagePath) {
                    await deleteFile(oldCover.thumbnailStoragePath).catch(err => console.error('Failed to delete old cover thumbnail:', err))
                }
                await db.delete(photos).where(eq(photos.id, oldCover.id)).catch(err => console.error('Failed to delete old cover photo record:', err))
            }
        }

        const [updatedAlbum] = await db.update(albums)
            .set({ coverPhotoId: coverPhoto.id })
            .where(eq(albums.id, id))
            .returning()

        const updatedCoverPhoto = await db.query.photos.findFirst({
            where: eq(photos.id, updatedAlbum.coverPhotoId!),
            columns: { id: true, blurhash: true },
        })

        return { success: true, message: 'Album cover updated successfully', data: updatedCoverPhoto }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update album cover' })
    }
})
