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
