import { eq } from 'drizzle-orm'
import { users } from '../../../../db/schema'
import { generateAuthenticationOptions, getRpConfig, saveChallenge } from '../../../../utils/webauthn'
import type { AuthenticatorTransportFuture } from '../../../../utils/webauthn'
import { enforceRateLimit } from '../../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, { key: 'passkey-options', limit: 20, windowMs: 5 * 60 * 1000 })
    const body = await readBody(event).catch(() => ({}))
    const email: string | undefined = body?.email?.trim() || undefined
    const { rpID } = getRpConfig()

    let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] = []

    if (email) {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
            with: { passkeys: { columns: { credentialId: true, transports: true } } },
        })
        if (user?.passkeys.length) {
            allowCredentials = user.passkeys.map(p => ({
                id: p.credentialId,
                transports: p.transports as AuthenticatorTransportFuture[],
            }))
        }
    }

    const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred', allowCredentials })
    const challengeId = saveChallenge(options.challenge)
    return { success: true, data: { options, challengeId } }
})
