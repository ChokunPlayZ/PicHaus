import sharp from 'sharp'
import { createHash } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, resolve, sep } from 'path'
import exifr from 'exifr'
import { encode } from 'blurhash'

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
    const image = sharp(buffer)
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

    // Very large files always get compressed regardless of origin
    if (fileSizeMB > 15) return true

    // If editing software is detected, respect the export as-is
    if (exifSoftware && EDITING_SOFTWARE_RE.test(exifSoftware)) return false

    // Fresh off camera (no editing software) and notably large → compress
    return fileSizeMB > 4 || megapixels > 15
}

/**
 * Compress an image to a web-friendly size. Returns the compressed buffer.
 */
export async function compressImage(buffer: Buffer, format: string): Promise<Buffer> {
    const MAX_DIMENSION = 4000
    let pipeline = sharp(buffer).resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
    })

    if (format === 'png') {
        pipeline = pipeline.png({ quality: 88, compressionLevel: 8 })
    } else {
        pipeline = pipeline.jpeg({ quality: 88, progressive: true })
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
        // Get dimensions from sharp
        const metadata = await sharp(buffer).metadata()

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
    const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
    const uploadDir = join(process.cwd(), storageBaseDir, subdirectory)

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true })

    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Return storage path (relative to storage root)
    return `${subdirectory}/${filename}`
}

/**
 * Get absolute file path from storage path
 */
export function getAbsoluteFilePath(storagePath: string): string {
    const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
    const storageRoot = resolve(process.cwd(), storageBaseDir)
    const normalizedStoragePath = storagePath.replace(/^\/+/, '')
    const resolvedPath = resolve(storageRoot, normalizedStoragePath)

    if (resolvedPath !== storageRoot && !resolvedPath.startsWith(storageRoot + sep)) {
        throw new Error('Invalid storage path')
    }

    return resolvedPath
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
        const fullPath = getAbsoluteFilePath(storagePath)

        // Check if file exists (using fs/promises access or just try unlink)
        const { unlink } = await import('fs/promises')
        await unlink(fullPath)
        return true
    } catch (error) {
        console.error(`Failed to delete file ${storagePath}:`, error)
        return false
    }
}
