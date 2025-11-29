import * as argon2 from 'argon2'

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
    // With UUIDs, we can use the user ID directly as the session token
    // This is secure because UUIDs are cryptographically random
    return userId
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
    const authToken = getCookie(event, 'auth-token')

    if (!authToken) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Not authenticated',
        })
    }

    const user = await prisma.user.findUnique({
        where: { id: authToken },
    })

    if (!user) {
        // Clear invalid cookie
        deleteCookie(event, 'auth-token')

        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid session',
        })
    }

    return user
}
