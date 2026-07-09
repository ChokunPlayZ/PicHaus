import sharp from 'sharp'
import { createHash, randomUUID } from 'crypto'
import exifr from 'exifr'
import { encode } from 'blurhash'
import { db } from './db'
import { photos } from '../db/schema'
import { getUnixTimestamp } from './auth'
import {
    deleteStorageFile,
    getLocalAbsoluteFilePath,
    readStorageFile,
    saveStorageFile,
    writeStorageFile,
} from './storage'

export { getLocalAbsoluteFilePath as getAbsoluteFilePath }

/**
 * Calculate SHA-256 hash of file buffer
 */
export function calculateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Generate thumbnail from image buffer (WebP format)
 */
export async function generateThumbnail(
    buffer: Buffer,
    maxWidth: number = 400,
    maxHeight: number = 400
): Promise<Buffer> {
    return await sharp(buffer)
        .rotate()
        .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer()
}

/**
 * Generate blurhash from image buffer
 */
export async function generateBlurhash(buffer: Buffer): Promise<string> {
    const image = sharp(buffer).rotate()
    const { data, info } = await image
        .resize(32, 32, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

    return encode(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        4,
        4
    )
}

const EDITING_SOFTWARE_RE = /lightroom|photoshop|capture\s*one|darktable|rawtherapee|luminar|on1|acdsee|gimp|pixelmator|affinity|snapseed|vsco|silkypix|dxo|imagemagick|topaz|helicon/i

/**
 * Detect if an image appears to be fresh off the camera (not post-processed in editing software)
 * and/or is unnecessarily large. Returns true when the image should be auto-compressed.
 */
export function shouldAutoCompress(
    buffer: Buffer,
    exifSoftware: string | undefined,
    width: number,
    height: number,
): boolean {
    const fileSizeMB = buffer.length / (1024 * 1024)
    const megapixels = (width * height) / 1_000_000

    const autoCompressLimit = parseFloat(process.env.AUTO_COMPRESS_LIMIT_MB || '15')
    const freshCompressLimit = parseFloat(process.env.FRESH_COMPRESS_LIMIT_MB || '4')
    const forceAll = process.env.AUTO_COMPRESS_FORCE === 'true'
    const ratioThreshold = parseFloat(process.env.AUTO_COMPRESS_RATIO_MB_PER_MP || '0.5')

    // Very large files always get compressed regardless of origin
    if (fileSizeMB > autoCompressLimit) return true

    // Check if the file size is disproportionately large for the image resolution (bloated JPEGs)
    const isJPEG = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8
    if (isJPEG && fileSizeMB > 1.5 && megapixels > 0 && (fileSizeMB / megapixels) > ratioThreshold) {
        return true
    }

    // If force compress all is disabled and editing software is detected, respect the export as-is
    if (!forceAll && exifSoftware && EDITING_SOFTWARE_RE.test(exifSoftware)) return false

    // Fresh off camera (or forced all) and notably large → compress
    return fileSizeMB > freshCompressLimit || megapixels > 15
}

/**
 * Compress an image to a web-friendly size. Returns the compressed buffer.
 */
export async function compressImage(buffer: Buffer, format: string): Promise<Buffer> {
    const maxDimension = parseInt(process.env.AUTO_COMPRESS_MAX_DIMENSION || '4000', 10)
    const quality = parseInt(process.env.AUTO_COMPRESS_QUALITY || '88', 10)

    let pipeline = sharp(buffer)
        .rotate()
        .resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .withMetadata() // Preserve EXIF/metadata in the compressed image

    if (format === 'png') {
        pipeline = pipeline.png({ quality, compressionLevel: 8 })
    } else {
        pipeline = pipeline.jpeg({ quality, progressive: true })
    }

    return pipeline.toBuffer()
}

/**
 * Extract EXIF data and dimensions from image buffer
 */
export async function extractExifData(buffer: Buffer): Promise<{
    width?: number
    height?: number
    cameraModel?: string
    lens?: string
    focalLength?: string
    iso?: number
    aperture?: string
    shutterSpeed?: string
    dateTaken?: number
    software?: string
}> {
    try {
        // Get dimensions from sharp (auto-rotated to match baked pixels)
        const metadata = await sharp(buffer).rotate().metadata()

        const exif = await exifr.parse(buffer, {
            pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'ISO', 'FNumber', 'ExposureTime', 'DateTimeOriginal', 'Software'],
        })

        const result: any = {
            width: metadata.width,
            height: metadata.height,
        }

        if (exif) {
            result.cameraModel = exif.Model ? `${exif.Make || ''} ${exif.Model}`.trim() : undefined
            result.lens = exif.LensModel || undefined
            result.focalLength = exif.FocalLength ? `${Number(exif.FocalLength).toFixed(1)}mm` : undefined
            result.iso = exif.ISO || undefined
            result.aperture = exif.FNumber ? `f/${Number(exif.FNumber).toFixed(1)}` : undefined
            result.shutterSpeed = exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : undefined
            result.dateTaken = exif.DateTimeOriginal ? Math.floor(new Date(exif.DateTimeOriginal).getTime() / 1000) : undefined
            result.software = exif.Software || undefined
        }

        return result
    } catch (error) {
        console.error('Error extracting EXIF data:', error)
        return {}
    }
}

/**
 * Save file to disk
 */
export async function saveFile(
    buffer: Buffer,
    filename: string,
    subdirectory: string = 'photos'
): Promise<string> {
    return saveStorageFile(buffer, filename, subdirectory)
}

/**
 * Validate image file
 */
export function validateImageFile(
    buffer: Buffer,
    maxSizeMB?: number
): { valid: boolean; error?: string } {
    const maxSizeBytes = (maxSizeMB || parseInt(process.env.MAX_FILE_SIZE_MB || '10')) * 1024 * 1024
    const size = buffer.length

    if (size > maxSizeBytes) {
        return {
            valid: false,
            error: `File size exceeds ${maxSizeBytes / 1024 / 1024}MB limit`,
        }
    }

    return { valid: true }
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string, hash: string, isWebP: boolean = false): string {
    const ext = isWebP ? 'webp' : (originalName.split('.').pop() || 'jpg')
    const timestamp = Date.now()
    return `${hash.substring(0, 16)}_${timestamp}.${ext}`
}

/**
 * Delete file from disk
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
    if (!storagePath) return false

    try {
        await deleteStorageFile(storagePath)
        return true
    } catch (error) {
        console.error(`Failed to delete file ${storagePath}:`, error)
        return false
    }
}

/**
 * Processes the uploaded photo in the background (compresses, extracts metadata/exif, generates thumbnail & blurhash, and inserts into DB)
 */
export async function processPhotoBackground(options: {
    storagePath: string
    originalFilename: string
    trustedMimeType: string
    fileHash: string
    albumId: string
    uploaderId: string | null
}): Promise<void> {
    let thumbnailStoragePath: string | null = null
    try {
        let fileBuffer: Buffer = await readStorageFile(options.storagePath)

        const exifData = await extractExifData(fileBuffer)
        let storedWidth = exifData.width ?? 0
        let storedHeight = exifData.height ?? 0

        // Compress if needed
        if (shouldAutoCompress(fileBuffer, exifData.software, storedWidth, storedHeight)) {
            const format = options.trustedMimeType.split('/')[1] ?? 'jpeg'
            fileBuffer = await compressImage(fileBuffer, format)
            await writeStorageFile(options.storagePath, fileBuffer)
            
            const compressedMeta = await sharp(fileBuffer).metadata()
            storedWidth = compressedMeta.width ?? storedWidth
            storedHeight = compressedMeta.height ?? storedHeight
        }

        const thumbnailBuffer = await generateThumbnail(fileBuffer)
        const blurhash = await generateBlurhash(fileBuffer)

        const thumbnailFilename = generateUniqueFilename(options.originalFilename, options.fileHash, true)
        thumbnailStoragePath = await saveFile(thumbnailBuffer, thumbnailFilename, 'thumbnails')

        const now = getUnixTimestamp()
        const photoId = randomUUID()

        await db.insert(photos).values({
            id: photoId,
            filename: options.storagePath.split('/').pop()!,
            originalName: options.originalFilename,
            storagePath: options.storagePath,
            thumbnailStoragePath,
            blurhash,
            size: fileBuffer.length,
            mimeType: options.trustedMimeType,
            fileHash: options.fileHash,
            albumId: options.albumId,
            uploaderId: options.uploaderId,
            cameraModel: exifData.cameraModel || null,
            lens: exifData.lens || null,
            focalLength: exifData.focalLength || null,
            iso: exifData.iso || null,
            aperture: exifData.aperture || null,
            shutterSpeed: exifData.shutterSpeed || null,
            dateTaken: exifData.dateTaken ? BigInt(exifData.dateTaken) : null,
            width: storedWidth,
            height: storedHeight,
            createdAt: now,
            updatedAt: now,
        })
    } catch (error) {
        console.error('Failed to process photo in background:', error)
        // Clean up files
        await deleteFile(options.storagePath).catch(() => {})
        if (thumbnailStoragePath) {
            await deleteFile(thumbnailStoragePath).catch(() => {})
        }
    }
}
