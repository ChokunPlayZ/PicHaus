import prisma from '../../../../utils/prisma'
import {
    generateAuthenticationOptions,
    getRpConfig,
    saveChallenge,
} from '../../../../utils/webauthn'
import type { AuthenticatorTransportFuture } from '../../../../utils/webauthn'

export default defineEventHandler(async (event) => {
    const body = await readBody(event).catch(() => ({}))
    const email: string | undefined = body?.email?.trim() || undefined

    const { rpID } = getRpConfig()

    // If email provided, restrict to that user's credentials so the browser
    // only prompts for their passkeys. Without email we use discoverable
    // credentials (the OS shows all matching passkeys for this origin).
    let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] = []

    if (email) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                passkeys: { select: { credentialId: true, transports: true } },
            },
        })
        if (user?.passkeys.length) {
            allowCredentials = user.passkeys.map(p => ({
                id: p.credentialId,
                transports: p.transports as AuthenticatorTransportFuture[],
            }))
        }
    }

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        allowCredentials,
    })

    const challengeId = saveChallenge(options.challenge)

    return { success: true, data: { options, challengeId } }
})
