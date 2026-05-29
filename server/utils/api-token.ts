import { webcrypto } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { apiTokens } from '../db/schema'

const TOKEN_PREFIX = 'pk_'
const TOKEN_LENGTH = 32

export function generateApiToken(): { token: string; prefix: string } {
    const array = new Uint8Array(TOKEN_LENGTH)
    webcrypto.getRandomValues(array)
    const randomString = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
    const token = `${TOKEN_PREFIX}${randomString}`
    return { token, prefix: token.slice(0, 8) + '...' }
}

export async function hashApiToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await webcrypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function validateApiToken(token: string) {
    if (!token.startsWith(TOKEN_PREFIX)) return null

    const tokenHash = await hashApiToken(token)

    const apiToken = await db.query.apiTokens.findFirst({
        where: eq(apiTokens.token, tokenHash),
        with: { user: true },
    })

    if (!apiToken) return null

    if (apiToken.expiresAt) {
        const now = BigInt(Math.floor(Date.now() / 1000))
        if (now > apiToken.expiresAt) return null
    }

    db.update(apiTokens)
        .set({ lastUsedAt: BigInt(Math.floor(Date.now() / 1000)) })
        .where(eq(apiTokens.id, apiToken.id))
        .catch(console.error)

    return apiToken
}

export async function requireApiToken(event: any) {
    const authHeader = getRequestHeader(event, 'Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
        throw createError({ statusCode: 401, statusMessage: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.substring(7)
    const apiToken = await validateApiToken(token)

    if (!apiToken) {
        throw createError({ statusCode: 401, statusMessage: 'Invalid API token' })
    }

    return apiToken
}
