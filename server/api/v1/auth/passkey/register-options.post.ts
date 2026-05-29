import { eq } from 'drizzle-orm'
import { passkeys } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'
import { generateRegistrationOptions, getRpConfig, saveChallenge } from '../../../../utils/webauthn'
import type { AuthenticatorTransportFuture } from '../../../../utils/webauthn'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const { rpID, rpName } = getRpConfig()

    const existing = await db.select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
        .from(passkeys)
        .where(eq(passkeys.userId, user.id))

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
        },
        excludeCredentials: existing.map(p => ({
            id: p.credentialId,
            transports: p.transports as AuthenticatorTransportFuture[],
        })),
    })

    const challengeId = saveChallenge(options.challenge, user.id)
    return { success: true, data: { options, challengeId } }
})
