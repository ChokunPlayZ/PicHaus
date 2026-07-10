import { createReadStream } from 'fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises'
import type { Stats } from 'fs'
import { createHmac, createHash } from 'crypto'
import { join, resolve, sep } from 'path'
import { Readable } from 'stream'

export interface StorageObjectMetadata {
    size: number
    lastModified?: Date
    etag?: string
}

export interface StorageObject extends StorageObjectMetadata {
    body: Readable | globalThis.ReadableStream<Uint8Array>
}

export function getStorageDriver(): 'local' | 's3' {
    return process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local'
}

export function getAssetDeliveryMode(): 'proxy' | 'redirect' {
    return process.env.ASSET_DELIVERY === 'redirect' ? 'redirect' : 'proxy'
}

function normalizeStoragePath(storagePath: string): string {
    const normalized = storagePath.replace(/^\/+/, '')
    if (!normalized || normalized.includes('\0')) {
        throw new Error('Invalid storage path')
    }
    return normalized
}

export function getLocalAbsoluteFilePath(storagePath: string): string {
    const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
    const storageRoot = resolve(process.cwd(), storageBaseDir)
    const normalizedStoragePath = normalizeStoragePath(storagePath)
    const resolvedPath = resolve(storageRoot, normalizedStoragePath)

    if (resolvedPath !== storageRoot && !resolvedPath.startsWith(storageRoot + sep)) {
        throw new Error('Invalid storage path')
    }

    return resolvedPath
}

function getLocalFilePath(storagePath: string): string {
    return getLocalAbsoluteFilePath(storagePath)
}

function getS3Config() {
    const bucket = process.env.S3_BUCKET
    const region = process.env.S3_REGION || 'us-east-1'
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
    const sessionToken = process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN
    const endpoint = process.env.S3_ENDPOINT
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === undefined
        ? Boolean(endpoint)
        : process.env.S3_FORCE_PATH_STYLE !== 'false'
    const prefix = (process.env.S3_PREFIX || '').replace(/^\/+|\/+$/g, '')

    if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error('S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY')
    }

    return { bucket, region, accessKeyId, secretAccessKey, sessionToken, endpoint, forcePathStyle, prefix }
}

function encodeS3KeyPart(part: string): string {
    return encodeURIComponent(part).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function encodeS3Key(key: string): string {
    return key.split('/').map(encodeS3KeyPart).join('/')
}

function buildS3Target(storagePath: string) {
    const config = getS3Config()
    const normalizedPath = normalizeStoragePath(storagePath)
    const key = config.prefix ? `${config.prefix}/${normalizedPath}` : normalizedPath
    const encodedKey = encodeS3Key(key)
    const baseEndpoint = config.endpoint || `https://s3.${config.region}.amazonaws.com`
    const endpointUrl = new URL(baseEndpoint)

    let url: URL
    let host: string
    let canonicalUri: string

    if (config.endpoint || config.forcePathStyle) {
        url = new URL(`${endpointUrl.origin}/${encodeS3KeyPart(config.bucket)}/${encodedKey}`)
        host = endpointUrl.host
        canonicalUri = `/${encodeS3KeyPart(config.bucket)}/${encodedKey}`
    } else {
        url = new URL(`${endpointUrl.protocol}//${config.bucket}.s3.${config.region}.amazonaws.com/${encodedKey}`)
        host = url.host
        canonicalUri = `/${encodedKey}`
    }

    return { ...config, key, url, host, canonicalUri }
}

function hmac(key: string | Buffer, value: string): Buffer {
    return createHmac('sha256', key).update(value).digest()
}

function hashHex(value: string | Buffer): string {
    return createHash('sha256').update(value).digest('hex')
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string) {
    const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp)
    const regionKey = hmac(dateKey, region)
    const serviceKey = hmac(regionKey, 's3')
    return hmac(serviceKey, 'aws4_request')
}

async function s3Fetch(storagePath: string, options: {
    method: 'GET' | 'HEAD' | 'PUT' | 'DELETE'
    body?: Buffer
    headers?: Record<string, string>
}): Promise<Response> {
    const target = buildS3Target(storagePath)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = options.body ? hashHex(options.body) : 'UNSIGNED-PAYLOAD'
    const headers: Record<string, string> = {
        host: target.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        ...(options.headers || {}),
    }

    if (target.sessionToken) {
        headers['x-amz-security-token'] = target.sessionToken
    }

    const canonicalHeaders = Object.entries(headers)
        .map(([key, value]) => [key.toLowerCase(), String(value).trim()] as const)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}\n`)
        .join('')
    const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(';')
    const canonicalRequest = [
        options.method,
        target.canonicalUri,
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n')
    const credentialScope = `${dateStamp}/${target.region}/s3/aws4_request`
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        hashHex(canonicalRequest),
    ].join('\n')
    const signature = createHmac('sha256', getSignatureKey(target.secretAccessKey, dateStamp, target.region))
        .update(stringToSign)
        .digest('hex')

    headers.Authorization = `AWS4-HMAC-SHA256 Credential=${target.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    return fetch(target.url, {
        method: options.method,
        headers,
        body: options.body ? new Uint8Array(options.body) : undefined,
    })
}

function encodeQueryValue(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function canonicalQuery(params: Record<string, string>): string {
    return Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${encodeQueryValue(key)}=${encodeQueryValue(value)}`)
        .join('&')
}

export function getDirectAssetUrl(storagePath: string): string | null {
    if (getAssetDeliveryMode() !== 'redirect' || getStorageDriver() !== 's3') return null

    const target = buildS3Target(storagePath)
    const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL
    if (publicBaseUrl) {
        const base = publicBaseUrl.endsWith('/') ? publicBaseUrl : `${publicBaseUrl}/`
        return new URL(encodeS3Key(target.key), base).toString()
    }

    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const expires = Math.max(1, Math.min(parseInt(process.env.S3_PRESIGNED_URL_TTL_SECONDS || '300', 10), 604800))
    const credentialScope = `${dateStamp}/${target.region}/s3/aws4_request`
    const signedHeaders = 'host'
    const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${target.accessKeyId}/${credentialScope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expires),
        'X-Amz-SignedHeaders': signedHeaders,
    }

    if (target.sessionToken) {
        queryParams['X-Amz-Security-Token'] = target.sessionToken
    }

    const canonicalRequest = [
        'GET',
        target.canonicalUri,
        canonicalQuery(queryParams),
        `host:${target.host}\n`,
        signedHeaders,
        'UNSIGNED-PAYLOAD',
    ].join('\n')
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        hashHex(canonicalRequest),
    ].join('\n')
    const signature = createHmac('sha256', getSignatureKey(target.secretAccessKey, dateStamp, target.region))
        .update(stringToSign)
        .digest('hex')

    const directUrl = new URL(target.url.toString())
    directUrl.search = `${canonicalQuery(queryParams)}&X-Amz-Signature=${signature}`
    return directUrl.toString()
}

function throwIfStorageError(res: Response, storagePath: string): void {
    if (res.ok) return
    const statusCode = res.status === 404 ? 404 : 502
    throw createError({
        statusCode,
        statusMessage: statusCode === 404 ? 'File not found on server' : `S3 storage request failed for ${storagePath}`,
    })
}

export async function saveStorageFile(buffer: Buffer, filename: string, subdirectory = 'photos'): Promise<string> {
    const storagePath = `${subdirectory}/${filename}`

    if (getStorageDriver() === 's3') {
        const contentType = subdirectory === 'thumbnails' ? 'image/webp' : undefined
        const res = await s3Fetch(storagePath, {
            method: 'PUT',
            body: buffer,
            headers: contentType ? { 'content-type': contentType } : undefined,
        })
        throwIfStorageError(res, storagePath)
        return storagePath
    }

    const storageBaseDir = process.env.STORAGE_DIR || 'storage/uploads'
    const uploadDir = join(process.cwd(), storageBaseDir, subdirectory)
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)
    return storagePath
}

export async function readStorageFile(storagePath: string): Promise<Buffer> {
    if (getStorageDriver() === 's3') {
        const res = await s3Fetch(storagePath, { method: 'GET' })
        throwIfStorageError(res, storagePath)
        return Buffer.from(await res.arrayBuffer())
    }

    return readFile(getLocalFilePath(storagePath))
}

export async function writeStorageFile(storagePath: string, buffer: Buffer): Promise<void> {
    if (getStorageDriver() === 's3') {
        const res = await s3Fetch(storagePath, { method: 'PUT', body: buffer })
        throwIfStorageError(res, storagePath)
        return
    }

    await writeFile(getLocalFilePath(storagePath), buffer)
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
    if (getStorageDriver() === 's3') {
        const res = await s3Fetch(storagePath, { method: 'DELETE' })
        if (!res.ok && res.status !== 404) throwIfStorageError(res, storagePath)
        return
    }

    await unlink(getLocalFilePath(storagePath))
}

export async function statStorageFile(storagePath: string): Promise<StorageObjectMetadata & { stats?: Stats }> {
    if (getStorageDriver() === 's3') {
        const res = await s3Fetch(storagePath, { method: 'HEAD' })
        throwIfStorageError(res, storagePath)
        return {
            size: Number(res.headers.get('content-length') || 0),
            lastModified: res.headers.get('last-modified') ? new Date(res.headers.get('last-modified')!) : undefined,
            etag: res.headers.get('etag') || undefined,
        }
    }

    const stats = await stat(getLocalFilePath(storagePath))
    return { size: stats.size, lastModified: stats.mtime, stats }
}

export async function getStorageObject(storagePath: string, range?: { start: number, end: number }): Promise<StorageObject> {
    if (getStorageDriver() === 's3') {
        const headers = range ? { range: `bytes=${range.start}-${range.end}` } : undefined
        const res = await s3Fetch(storagePath, { method: 'GET', headers })
        throwIfStorageError(res, storagePath)
        if (!res.body) throw createError({ statusCode: 404, statusMessage: 'File not found on server' })

        return {
            size: Number(res.headers.get('content-length') || 0),
            lastModified: res.headers.get('last-modified') ? new Date(res.headers.get('last-modified')!) : undefined,
            etag: res.headers.get('etag') || undefined,
            body: Readable.fromWeb(res.body as any),
        }
    }

    const filePath = getLocalFilePath(storagePath)
    const stats = await stat(filePath)
    return {
        size: range ? range.end - range.start + 1 : stats.size,
        lastModified: stats.mtime,
        body: createReadStream(filePath, range ? { start: range.start, end: range.end } : undefined),
    }
}

export async function checkStorageWritable(): Promise<{ ok: boolean, location: string, error: string | null }> {
    const driver = getStorageDriver()
    const probeName = `.healthcheck-${Date.now()}`
    const location = driver === 's3'
        ? `s3://${process.env.S3_BUCKET || ''}${process.env.S3_PREFIX ? `/${process.env.S3_PREFIX}` : ''}`
        : (process.env.STORAGE_DIR || 'storage/uploads')

    try {
        const path = await saveStorageFile(Buffer.alloc(0), probeName, '.healthcheck')
        await deleteStorageFile(path).catch(() => {})
        return { ok: true, location, error: null }
    } catch (err: any) {
        return { ok: false, location, error: err?.message || 'Storage is not writable' }
    }
}
