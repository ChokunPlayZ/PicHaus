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
}> {
    try {
        // Get dimensions from sharp
        const metadata = await sharp(buffer).metadata()

        const exif = await exifr.parse(buffer, {
            pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'ISO', 'FNumber', 'ExposureTime', 'DateTimeOriginal'],
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
