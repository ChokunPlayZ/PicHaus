import { webcrypto } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import prisma from './prisma'

const TOKEN_PREFIX = 'pk_'
const TOKEN_LENGTH = 32

/**
 * Generate a secure random API token
 * Format: pk_<random_string>
 */
export function generateApiToken(): { token: string; prefix: string } {
    const array = new Uint8Array(TOKEN_LENGTH)
    webcrypto.getRandomValues(array)
    const randomString = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
    const token = `${TOKEN_PREFIX}${randomString}`

    return {
        token,
        prefix: token.slice(0, 8) + '...'
    }
}

/**
 * Hash an API token for storage
 * Using SHA-256 is sufficient for high-entropy tokens
 */
export async function hashApiToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await webcrypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate an API token
 */
export async function validateApiToken(token: string) {
    if (!token.startsWith(TOKEN_PREFIX)) {
        return null
    }

    const tokenHash = await hashApiToken(token)

    const apiToken = await prisma.apiToken.findUnique({
        where: { token: tokenHash },
        include: {
            user: true
        }
    })

    if (!apiToken) {
        return null
    }

    // Check expiration
    if (apiToken.expiresAt) {
        const now = BigInt(Math.floor(Date.now() / 1000))
        if (now > apiToken.expiresAt) {
            return null
        }
    }

    // Update last used asynchronously
    prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsedAt: BigInt(Math.floor(Date.now() / 1000)) }
    }).catch(console.error)

    return apiToken
}

/**
 * H3 helper to require API token from Authorization header through Bearer scheme
 */
export async function requireApiToken(event: any) {
    const authHeader = getRequestHeader(event, 'Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Missing or invalid Authorization header'
        })
    }

    const token = authHeader.substring(7)
    const apiToken = await validateApiToken(token)

    if (!apiToken) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid API token'
        })
    }

    return apiToken
}
