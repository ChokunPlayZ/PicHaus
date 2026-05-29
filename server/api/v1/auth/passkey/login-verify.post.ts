import prisma from '../../../../utils/prisma'
import { createAccessToken, getUnixTimestamp } from '../../../../utils/auth'
import {
    verifyAuthenticationResponse,
    getRpConfig,
    consumeChallenge,
} from '../../../../utils/webauthn'
import type { AuthenticatorTransportFuture } from '../../../../utils/webauthn'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { response, challengeId } = body

    if (!response || !challengeId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing response or challengeId' })
    }

    const entry = consumeChallenge(challengeId)
    if (!entry) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or expired challenge' })
    }

    // Look up the passkey by the credential ID the authenticator reported
    const credentialId: string = response.id
    const passkey = await prisma.passkey.findUnique({
        where: { credentialId },
        include: { user: true },
    })

    if (!passkey) {
        throw createError({ statusCode: 401, statusMessage: 'Unknown passkey' })
    }

    const { rpID, origin } = getRpConfig()

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: entry.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credentialId,
                publicKey: Buffer.from(passkey.publicKey, 'base64url'),
                counter: passkey.counter,
                transports: passkey.transports as AuthenticatorTransportFuture[],
            },
        })
    } catch (err: any) {
        throw createError({ statusCode: 401, statusMessage: err.message ?? 'Authentication failed' })
    }

    if (!verification.verified || !verification.authenticationInfo) {
        throw createError({ statusCode: 401, statusMessage: 'Passkey authentication failed' })
    }

    // Update counter and last-used timestamp (prevents replay attacks)
    await prisma.passkey.update({
        where: { id: passkey.id },
        data: {
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: getUnixTimestamp(),
        },
    })

    const accessToken = await createAccessToken(passkey.userId)

    return {
        success: true,
        data: {
            accessToken,
            id: passkey.user.id,
            name: passkey.user.name,
            email: passkey.user.email,
        },
    }
})
