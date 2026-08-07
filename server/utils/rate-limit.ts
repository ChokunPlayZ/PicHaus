interface RateLimitEntry {
    count: number
    resetAt: number
}

interface RateLimitOptions {
    key: string
    limit: number
    windowMs: number
}

const entries = new Map<string, RateLimitEntry>()
const MAX_ENTRIES = 10_000

function clientAddress(event: any): string {
    if (process.env.TRUST_PROXY === 'true') {
        const forwarded = getRequestHeader(event, 'x-forwarded-for')
        const first = forwarded?.split(',')[0]?.trim()
        if (first) return first
    }

    return event.node?.req?.socket?.remoteAddress || 'unknown'
}

function prune(now: number): void {
    for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key)
    }

    while (entries.size > MAX_ENTRIES) {
        const oldest = entries.keys().next().value
        if (!oldest) break
        entries.delete(oldest)
    }
}

function entryKey(event: any, options: Pick<RateLimitOptions, 'key'>): string {
    return `${options.key}:${clientAddress(event)}`
}

export function enforceRateLimit(event: any, options: RateLimitOptions): void {
    const now = Date.now()
    if (entries.size >= MAX_ENTRIES) prune(now)

    const key = entryKey(event, options)
    const current = entries.get(key)
    const entry = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : current

    entry.count += 1
    entries.delete(key)
    entries.set(key, entry)

    const remaining = Math.max(options.limit - entry.count, 0)
    setResponseHeader(event, 'X-RateLimit-Limit', String(options.limit))
    setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))
    setResponseHeader(event, 'X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > options.limit) {
        const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1)
        setResponseHeader(event, 'Retry-After', retryAfter)
        throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }
}

export function refundRateLimit(event: any, options: Pick<RateLimitOptions, 'key' | 'limit'>): void {
    const key = entryKey(event, options)
    const entry = entries.get(key)
    if (!entry) return

    entry.count -= 1
    if (entry.count <= 0) {
        entries.delete(key)
        setResponseHeader(event, 'X-RateLimit-Remaining', String(options.limit))
        return
    }

    entries.delete(key)
    entries.set(key, entry)
    setResponseHeader(event, 'X-RateLimit-Remaining', String(Math.max(options.limit - entry.count, 0)))
}

export function resetRateLimitsForTests(): void {
    entries.clear()
}
