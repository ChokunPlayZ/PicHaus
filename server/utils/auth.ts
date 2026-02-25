import * as argon2 from 'argon2'
import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_COOKIE_NAME = 'auth-token'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8')
}

function getSessionSecret(): string {
    const secret = process.env.AUTH_SECRET || process.env.NUXT_SESSION_SECRET || process.env.JWT_SECRET

    if (!secret) {
        if (process.env.NODE_ENV !== 'production') {
            return 'picHaus-dev-session-secret-change-me-immediately'
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Server session secret is missing',
        })
    }

    if (secret.length < 32) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Server session secret is too short',
        })
    }

    return secret
}

/**
 * Hash a password using Argon2id
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1,
    })
}

/**
 * Verify a password against a hash
 * @param hash - Argon2id hash
 * @param password - Plain text password to verify
 * @returns True if password matches
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, password)
    } catch (error) {
        return false
    }
}

/**
 * Create a session for a user
 * Returns the user's UUID to be used as the session token
 */
export async function createSession(userId: string): Promise<string> {
    const payload = {
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }

    const encodedPayload = base64UrlEncode(JSON.stringify(payload))
    const signature = createHmac('sha256', getSessionSecret())
        .update(encodedPayload)
        .digest('base64url')

    return `${encodedPayload}.${signature}`
}

function verifySessionToken(token: string): { userId: string } | null {
    const parts = token.split('.')
    if (parts.length !== 2) {
        return null
    }

    const [encodedPayload, signature] = parts
    const expectedSignature = createHmac('sha256', getSessionSecret())
        .update(encodedPayload)
        .digest('base64url')

    const expectedBuffer = Buffer.from(expectedSignature)
    const providedBuffer = Buffer.from(signature)

    if (
        expectedBuffer.length !== providedBuffer.length ||
        !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
        return null
    }

    try {
        const parsedPayload = JSON.parse(base64UrlDecode(encodedPayload)) as { sub?: string; exp?: number }
        if (!parsedPayload.sub || !parsedPayload.exp) {
            return null
        }

        const now = Math.floor(Date.now() / 1000)
        if (parsedPayload.exp < now) {
            return null
        }

        return { userId: parsedPayload.sub }
    } catch {
        return null
    }
}

export function getAuthUserId(event: any): string | null {
    const authToken = getCookie(event, SESSION_COOKIE_NAME)
    if (!authToken) {
        return null
    }

    const session = verifySessionToken(authToken)
    return session?.userId || null
}

export async function setAuthCookie(event: any, userId: string): Promise<void> {
    const sessionToken = await createSession(userId)

    setCookie(event, SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SECONDS,
        path: '/',
    })
}

export function clearAuthCookie(event: any): void {
    deleteCookie(event, SESSION_COOKIE_NAME)
}

/**
 * Get current Unix timestamp in seconds
 * @returns Unix timestamp
 */
export function getUnixTimestamp(): bigint {
    return BigInt(Math.floor(Date.now() / 1000))
}

/**
 * Convert Date to Unix timestamp
 * @param date - JavaScript Date object
 * @returns Unix timestamp
 */
export function dateToUnixTimestamp(date: Date): bigint {
    return BigInt(Math.floor(date.getTime() / 1000))
}

/**
 * Convert Unix timestamp to Date
 * @param timestamp - Unix timestamp (BigInt or number)
 * @returns JavaScript Date object
 */
export function unixTimestampToDate(timestamp: bigint | number): Date {
    const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
    return new Date(ts * 1000)
}
/**
 * Require authentication for a request
 * @param event - H3 event
 * @returns Authenticated user
 * @throws 401 if not authenticated
 */
export async function requireAuth(event: any) {
    const userId = getAuthUserId(event)

    if (!userId) {
        clearAuthCookie(event)
        throw createError({
            statusCode: 401,
            statusMessage: 'Not authenticated',
        })
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    })

    if (!user) {
        // Clear invalid cookie
        clearAuthCookie(event)

        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid session',
        })
    }

    return user
}
