import { passkeys } from '../../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../../utils/auth'
import { verifyRegistrationResponse, getRpConfig, consumeChallenge } from '../../../../utils/webauthn'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readBody(event)
    const { response, challengeId, name } = body

    if (!response || !challengeId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing response or challengeId' })
    }

    const entry = consumeChallenge(challengeId)
    if (!entry || entry.userId !== user.id) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or expired challenge' })
    }

    const { rpID, origin } = getRpConfig()

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: entry.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        })
    } catch (err: any) {
        throw createError({ statusCode: 400, statusMessage: err.message ?? 'Verification failed' })
    }

    if (!verification.verified || !verification.registrationInfo) {
        throw createError({ statusCode: 400, statusMessage: 'Passkey registration failed' })
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
    const publicKeyB64 = Buffer.from(credential.publicKey).toString('base64url')
    const transports: string[] = credential.transports ?? []
    const autoName = transports.includes('usb') || transports.includes('nfc') || transports.includes('ble')
        ? 'Security Key'
        : credentialDeviceType === 'multiDevice'
        ? 'Passkey'
        : 'Device Passkey'

    await db.insert(passkeys).values({
        credentialId: credential.id,
        publicKey: publicKeyB64,
        counter: credential.counter,
        transports,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name: (typeof name === 'string' && name.trim()) ? name.trim() : autoName,
        userId: user.id,
        createdAt: getUnixTimestamp(),
    })

    return { success: true }
})
