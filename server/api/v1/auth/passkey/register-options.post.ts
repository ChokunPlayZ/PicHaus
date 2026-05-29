import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'
import {
    generateRegistrationOptions,
    getRpConfig,
    saveChallenge,
} from '../../../../utils/webauthn'
import type { AuthenticatorTransportFuture } from '../../../../utils/webauthn'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const { rpID, rpName } = getRpConfig()

    const existing = await prisma.passkey.findMany({
        where: { userId: user.id },
        select: { credentialId: true, transports: true },
    })

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: user.email ?? user.name ?? user.id,
        userID: new TextEncoder().encode(user.id),
        userDisplayName: user.name ?? user.email ?? 'User',
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            // No authenticatorAttachment restriction → allows both platform (Touch ID / Face ID /
            // Windows Hello) and roaming authenticators (YubiKey, other FIDO2 hardware keys)
        },
        excludeCredentials: existing.map(p => ({
            id: p.credentialId,
            transports: p.transports as AuthenticatorTransportFuture[],
        })),
    })

    const challengeId = saveChallenge(options.challenge, user.id)

    return { success: true, data: { options, challengeId } }
})
