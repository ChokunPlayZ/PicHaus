import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import { generateApiToken, hashApiToken } from '../../../utils/api-token'

export default defineEventHandler(async (event) => {
    // Require authentication
    const user = await requireAuth(event)

    // Parse body
    const body = await readBody(event)
    const { name, expiresAt, scopes } = body

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
            scopes: scopes || [], // Default to empty array if not provided
            expiresAt: expiresAt ? BigInt(expiresAt) : null,
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
