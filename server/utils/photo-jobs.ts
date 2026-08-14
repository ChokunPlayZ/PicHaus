import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { photos } from '../db/schema'
import { db } from './db'
import { getUnixTimestamp } from './auth'
import { readStorageFile, writeStorageFile } from './storage'
import {
    compressImage,
    deleteFile,
    extractExifData,
    generateBlurhash,
    generateThumbnail,
    generateUniqueFilename,
    saveFile,
    shouldAutoCompress,
} from './upload'
import { enqueueJob, registerJobHandler } from './queue'
import type { JobRecord } from './queue'

interface MetadataJobPayload {
    photoId: string
    storagePath: string
    originalFilename: string
    trustedMimeType: string
}

interface ThumbnailJobPayload {
    photoId: string
    storagePath: string
}

async function deletePhotoAndFiles(photoId: string): Promise<void> {
    try {
        const [photo] = await db.select({
            storagePath: photos.storagePath,
            thumbnailStoragePath: photos.thumbnailStoragePath,
        }).from(photos).where(eq(photos.id, photoId))

        await db.update(photos).set({
            processingStatus: 'failed',
            updatedAt: getUnixTimestamp(),
        }).where(eq(photos.id, photoId))
        await db.delete(photos).where(eq(photos.id, photoId))

        if (photo?.storagePath) await deleteFile(photo.storagePath).catch(() => {})
        if (photo?.thumbnailStoragePath) await deleteFile(photo.thumbnailStoragePath).catch(() => {})
    } catch (error) {
        console.error('Failed to clean up photo after metadata job failure:', error)
    }
}

async function handleMetadataJob(job: JobRecord): Promise<void> {
    const { photoId, storagePath, originalFilename, trustedMimeType } = job.payload as MetadataJobPayload

    try {
        await db.update(photos).set({
            processingStatus: 'processing',
            updatedAt: getUnixTimestamp(),
        }).where(eq(photos.id, photoId))

        let fileBuffer = await readStorageFile(storagePath)
        const exifData = await extractExifData(fileBuffer)
        let storedWidth = exifData.width ?? 0
        let storedHeight = exifData.height ?? 0

        // Compress in place when the file is unnecessarily large
        if (shouldAutoCompress(fileBuffer, exifData.software, storedWidth, storedHeight)) {
            const format = trustedMimeType.split('/')[1] ?? 'jpeg'
            fileBuffer = await compressImage(fileBuffer, format)
            await writeStorageFile(storagePath, fileBuffer)

            const compressedMeta = await sharp(fileBuffer).metadata()
            storedWidth = compressedMeta.width ?? storedWidth
            storedHeight = compressedMeta.height ?? storedHeight
        }

        await db.update(photos).set({
            size: fileBuffer.length,
            width: storedWidth,
            height: storedHeight,
            cameraModel: exifData.cameraModel || null,
            lens: exifData.lens || null,
            focalLength: exifData.focalLength || null,
            iso: exifData.iso || null,
            aperture: exifData.aperture || null,
            shutterSpeed: exifData.shutterSpeed || null,
            dateTaken: exifData.dateTaken ? BigInt(exifData.dateTaken) : null,
            updatedAt: getUnixTimestamp(),
        }).where(eq(photos.id, photoId))

        await enqueueJob('thumbnail', { photoId, storagePath })
    } catch (error) {
        // Only clean up once the queue has exhausted all retry attempts
        if (job.attempts + 1 >= job.maxAttempts) {
            await deletePhotoAndFiles(photoId)
        }
        throw error
    }
}

async function handleThumbnailJob(job: JobRecord): Promise<void> {
    const { photoId, storagePath } = job.payload as ThumbnailJobPayload

    try {
        const photo = await db.query.photos.findFirst({ where: eq(photos.id, photoId) })
        if (!photo) return

        const fileBuffer = await readStorageFile(storagePath)
        const thumbnailBuffer = await generateThumbnail(fileBuffer)
        const blurhash = await generateBlurhash(fileBuffer)
        const thumbnailFilename = generateUniqueFilename(photo.originalName, photo.fileHash, true)
        const thumbnailStoragePath = await saveFile(thumbnailBuffer, thumbnailFilename, 'thumbnails')

        await db.update(photos).set({
            thumbnailStoragePath,
            blurhash,
            processingStatus: 'completed',
            updatedAt: getUnixTimestamp(),
        }).where(eq(photos.id, photoId))

        if (process.env.FACE_DETECTION_ENABLED === 'true') {
            await enqueueJob('face-detection', { photoId, storagePath })
        }
    } catch (error) {
        // Keep the photo row so the full-size image stays viewable
        if (job.attempts + 1 >= job.maxAttempts) {
            try {
                await db.update(photos).set({
                    processingStatus: 'failed',
                    updatedAt: getUnixTimestamp(),
                }).where(eq(photos.id, photoId))
            } catch {}
        }
        throw error
    }
}

export function registerPhotoJobHandlers(): void {
    registerJobHandler('metadata', handleMetadataJob)
    registerJobHandler('thumbnail', handleThumbnailJob)
}
