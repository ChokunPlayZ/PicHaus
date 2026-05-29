import { eq } from 'drizzle-orm'
import { passkeys } from '../../../../db/schema'
import { createAccessToken, getUnixTimestamp } from '../../../../utils/auth'
import { verifyAuthenticationResponse, getRpConfig, consumeChallenge } from '../../../../utils/webauthn'
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

    const credentialId: string = response.id
    const passkey = await db.query.passkeys.findFirst({
        where: eq(passkeys.credentialId, credentialId),
        with: { user: true },
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

    await db.update(passkeys)
        .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: getUnixTimestamp() })
        .where(eq(passkeys.id, passkey.id))

    const accessToken = await createAccessToken(passkey.userId)

    return {
        success: true,
        data: { accessToken, id: passkey.user.id, name: passkey.user.name, email: passkey.user.email },
    }
})
