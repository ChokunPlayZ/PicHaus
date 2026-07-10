import { resolve, sep } from 'node:path'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const SHA256_RE = /^[0-9a-f]{64}$/i

export function configuredUploadLimitBytes(): number {
    const configured = Number(process.env.MAX_FILE_SIZE_MB || '10')
    const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 10
    return Math.floor(megabytes * 1024 * 1024)
}

export function configuredChunkLimitBytes(): number {
    const configured = Number(process.env.RESUMABLE_CHUNK_SIZE_MB || '3')
    const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 3
    return Math.floor(megabytes * 1024 * 1024)
}

export function resumableRoot(): string {
    const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
    return resolve(process.cwd(), storageBaseDir, 'resumable')
}

export function resumableSessionDir(uploadId: string): string {
    if (!UUID_RE.test(uploadId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid upload session ID' })
    }

    const root = resumableRoot()
    const sessionDir = resolve(root, uploadId)
    if (!sessionDir.startsWith(`${root}${sep}`)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid upload session path' })
    }
    return sessionDir
}
