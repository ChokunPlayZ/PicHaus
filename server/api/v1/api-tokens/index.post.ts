import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import { generateApiToken, hashApiToken } from '../../../utils/api-token'

const ALLOWED_SCOPES = ['albums:read', 'photos:read'] as const

export default defineEventHandler(async (event) => {
    // Require authentication
    const user = await requireAuth(event)

    // Parse body
    const body = await readBody(event)
    const { name, expiresAt, scopes } = body
    const requestedScopes = Array.isArray(scopes)
        ? scopes.filter((scope: unknown): scope is string => typeof scope === 'string')
        : []

    const invalidScopes = requestedScopes.filter((scope) => !ALLOWED_SCOPES.includes(scope as (typeof ALLOWED_SCOPES)[number]))
    if (invalidScopes.length > 0) {
        throw createError({
            statusCode: 400,
            statusMessage: `Invalid scopes: ${invalidScopes.join(', ')}`,
        })
    }

    const parsedExpiresAt = expiresAt !== undefined && expiresAt !== null
        ? Number(expiresAt)
        : null

    if (parsedExpiresAt !== null && (!Number.isFinite(parsedExpiresAt) || parsedExpiresAt <= 0)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid expiresAt value',
        })
    }


    if (!name) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Token name is required',
        })
    }

    // Generate token
    const { token, prefix } = generateApiToken()
    const tokenHash = await hashApiToken(token)

    // Store in DB
    const apiToken = await prisma.apiToken.create({
        data: {
            name,
            token: tokenHash,
            tokenPrefix: prefix,
            scopes: requestedScopes,
            expiresAt: parsedExpiresAt ? BigInt(Math.floor(parsedExpiresAt)) : null,
            createdAt: BigInt(Math.floor(Date.now() / 1000)),
            userId: user.id,
        },
    })

    // Return token only once
    return {
        success: true,
        data: {
            id: apiToken.id,
            name: apiToken.name,
            token: token, // The only time we return the full token
            prefix: apiToken.tokenPrefix,
            scopes: apiToken.scopes,
            expiresAt: apiToken.expiresAt ? Number(apiToken.expiresAt) : null,
            createdAt: Number(apiToken.createdAt),
        },
    }
})
