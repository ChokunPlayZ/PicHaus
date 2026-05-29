import { apiTokens } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { generateApiToken, hashApiToken } from '../../../utils/api-token'

const ALLOWED_SCOPES = ['albums:read', 'photos:read'] as const

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readBody(event)
    const { name, expiresAt, scopes } = body

    const requestedScopes = Array.isArray(scopes)
        ? scopes.filter((scope: unknown): scope is string => typeof scope === 'string')
        : []

    const invalidScopes = requestedScopes.filter(scope => !ALLOWED_SCOPES.includes(scope as any))
    if (invalidScopes.length > 0) {
        throw createError({ statusCode: 400, statusMessage: `Invalid scopes: ${invalidScopes.join(', ')}` })
    }

    const parsedExpiresAt = expiresAt !== undefined && expiresAt !== null ? Number(expiresAt) : null
    if (parsedExpiresAt !== null && (!Number.isFinite(parsedExpiresAt) || parsedExpiresAt <= 0)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid expiresAt value' })
    }
    if (!name) throw createError({ statusCode: 400, statusMessage: 'Token name is required' })

    const { token, prefix } = generateApiToken()
    const tokenHash = await hashApiToken(token)

    const [apiToken] = await db.insert(apiTokens).values({
        name,
        token: tokenHash,
        tokenPrefix: prefix,
        scopes: requestedScopes,
        expiresAt: parsedExpiresAt ? BigInt(Math.floor(parsedExpiresAt)) : null,
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        userId: user.id,
    }).returning()

    return {
        success: true,
        data: {
            id: apiToken.id,
            name: apiToken.name,
            token,
            prefix: apiToken.tokenPrefix,
            scopes: apiToken.scopes,
            expiresAt: apiToken.expiresAt ? Number(apiToken.expiresAt) : null,
            createdAt: Number(apiToken.createdAt),
        },
    }
})
