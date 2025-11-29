import sharp from 'sharp'
import { createHash } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
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
            result.focalLength = exif.FocalLength ? `${exif.FocalLength}mm` : undefined
            result.iso = exif.ISO || undefined
            result.aperture = exif.FNumber ? `f/${exif.FNumber}` : undefined
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
    const uploadBaseDir = process.env.UPLOAD_DIR || 'public/uploads'
    const uploadDir = join(process.cwd(), uploadBaseDir, subdirectory)

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true })

    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Return public URL path (remove 'public/' prefix)
    const publicPath = uploadBaseDir.replace(/^public\//, '')
    return `/${publicPath}/${subdirectory}/${filename}`
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
export async function deleteFile(publicPath: string): Promise<boolean> {
    if (!publicPath) return false

    try {
        const uploadBaseDir = process.env.UPLOAD_DIR || 'public/uploads'
        // publicPath typically starts with /, e.g. /uploads/photos/filename.jpg
        // We need to construct the absolute path

        // Remove leading slash if present
        const relativePath = publicPath.startsWith('/') ? publicPath.substring(1) : publicPath

        // If the path already includes the base dir (e.g. uploads/...), we need to be careful
        // The saveFile function returns paths like /uploads/photos/filename.jpg (if base is public/uploads)
        // So we can map it back.

        // Let's assume standard structure: public/uploads/photos/filename.jpg
        // publicPath: /uploads/photos/filename.jpg

        // If we join process.cwd() + public + publicPath (as returned by saveFile which strips 'public')
        const fullPath = join(process.cwd(), 'public', relativePath)

        // Check if file exists (using fs/promises access or just try unlink)
        const { unlink } = await import('fs/promises')
        await unlink(fullPath)
        return true
    } catch (error) {
        console.error(`Failed to delete file ${publicPath}:`, error)
        return false
    }
}
