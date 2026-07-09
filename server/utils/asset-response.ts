import { createReadStream } from 'fs'
import type { Stats } from 'fs'

interface StreamAssetOptions {
    filePath: string
    stats: Stats
    contentType: string
    cacheControl: string
    lastModified?: Date
    etagSeed: string
}

function parseRangeHeader(rangeHeader: string | undefined, size: number) {
    if (!rangeHeader?.startsWith('bytes=')) return null

    const [startPart = '', endPart = ''] = rangeHeader.slice('bytes='.length).split('-', 2)
    let start = startPart ? Number(startPart) : Number.NaN
    let end = endPart ? Number(endPart) : Number.NaN

    if (!startPart && endPart) {
        const suffixLength = Number(endPart)
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) return 'invalid'
        start = Math.max(size - suffixLength, 0)
        end = size - 1
    } else {
        if (!Number.isFinite(start) || start < 0) return 'invalid'
        if (!Number.isFinite(end)) end = size - 1
    }

    if (start > end || start >= size) return 'invalid'

    return {
        start,
        end: Math.min(end, size - 1),
    }
}

export function getImmutableAssetCacheControl(isPublic: boolean): string {
    if (isPublic) {
        return 'public, max-age=31536000, immutable'
    }

    return 'private, max-age=604800, stale-while-revalidate=86400'
}

export function sendCachedAsset(event: any, options: StreamAssetOptions) {
    const lastModified = options.lastModified || options.stats.mtime
    const lastModifiedMs = Math.floor(lastModified.getTime() / 1000) * 1000
    const etag = `"${Buffer.from(`${options.etagSeed}:${options.stats.size}:${lastModifiedMs}`).toString('base64url')}"`
    const requestHeaders = getRequestHeaders(event)
    const ifNoneMatch = requestHeaders['if-none-match']
    const ifModifiedSince = requestHeaders['if-modified-since']

    setHeader(event, 'Cache-Control', options.cacheControl)
    setHeader(event, 'ETag', etag)
    setHeader(event, 'Last-Modified', lastModified.toUTCString())
    setHeader(event, 'Accept-Ranges', 'bytes')
    setHeader(event, 'Content-Type', options.contentType)
    setHeader(event, 'X-Content-Type-Options', 'nosniff')

    if (
        ifNoneMatch === etag ||
        (!ifNoneMatch && ifModifiedSince && Date.parse(ifModifiedSince) >= lastModifiedMs)
    ) {
        setResponseStatus(event, 304)
        return null
    }

    const range = parseRangeHeader(requestHeaders.range, options.stats.size)
    if (range === 'invalid') {
        setHeader(event, 'Content-Range', `bytes */${options.stats.size}`)
        throw createError({ statusCode: 416, statusMessage: 'Range Not Satisfiable' })
    }

    if (range) {
        const contentLength = range.end - range.start + 1
        setResponseStatus(event, 206)
        setHeader(event, 'Content-Length', contentLength)
        setHeader(event, 'Content-Range', `bytes ${range.start}-${range.end}/${options.stats.size}`)
        return sendStream(event, createReadStream(options.filePath, { start: range.start, end: range.end }))
    }

    setHeader(event, 'Content-Length', options.stats.size)
    return sendStream(event, createReadStream(options.filePath))
}
