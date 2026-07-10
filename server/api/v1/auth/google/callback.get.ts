import { eq, or } from 'drizzle-orm'
import sharp from 'sharp'
import { users } from '../../../../db/schema'
import { createAccessToken, getUnixTimestamp } from '../../../../utils/auth'
import { consumeGoogleOAuthState, exchangeGoogleCode, getGoogleUserInfo, storePendingAuth } from '../../../../utils/google-oauth'
import { saveStorageFile } from '../../../../utils/storage'
import { getRegistrationPolicy } from '../../../../utils/registration'
import { enforceRateLimit } from '../../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = typeof query.code === 'string' ? query.code : ''
    const state = typeof query.state === 'string' ? query.state : ''

    const redirectToError = (msg: string) =>
        sendRedirect(event, `/auth/google/complete?error=${encodeURIComponent(msg)}`, 302)

    if (!code) return redirectToError('No authorization code received from Google')

    try {
        enforceRateLimit(event, { key: 'google-callback', limit: 20, windowMs: 5 * 60 * 1000 })
        const statePayload = consumeGoogleOAuthState(state)
        if (!statePayload) return redirectToError('Invalid or expired sign-in state')

        const policy = await getRegistrationPolicy()
        if (!policy.googleOAuthEnabled) return redirectToError('Google sign-in is not enabled')

        let bypassDomain = false
        try {
            bypassDomain = Boolean(JSON.parse(Buffer.from(statePayload, 'base64url').toString('utf8')).bypassDomain)
        } catch {}

        const requestUrl = getRequestURL(event)
        const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/v1/auth/google/callback`

        const googleAccessToken = await exchangeGoogleCode(code, redirectUri)
        const userInfo = await getGoogleUserInfo(googleAccessToken)

        if (!userInfo.email_verified) return redirectToError('Google account email is not verified')

        // Check domain restriction
        const allowedDomain = bypassDomain && policy.googleOAuthShiftBypassEnabled
            ? null
            : policy.googleOAuthAllowedDomain
        if (allowedDomain) {
            // Validate the hd claim from Google's token — the authoritative hosted-domain
            // field for Workspace accounts; cannot be spoofed by a matching email address
            // on a personal Gmail account.
            if (userInfo.hd !== allowedDomain) {
                return redirectToError(`Only @${allowedDomain} accounts are allowed to sign in`)
            }
        }

        // Find or create user by googleId or email
        type DbUser = typeof users.$inferSelect
        let user: DbUser | null = await db.query.users.findFirst({
            where: or(eq(users.googleId, userInfo.sub), eq(users.email, userInfo.email)),
        }).then(r => r ?? null)

        const now = getUnixTimestamp()
        let isNewUser = false

        if (user) {
            if (!user.googleId) {
                const [updated] = await db.update(users)
                    .set({ googleId: userInfo.sub, updatedAt: now })
                    .where(eq(users.id, user.id))
                    .returning()
                if (updated) user = updated
            }
        } else {
            if (!policy.allowRegistration) {
                return redirectToError('Public registration is disabled')
            }
            isNewUser = true
            const [created] = await db.insert(users).values({
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
                googleId: userInfo.sub,
                createdAt: now,
                updatedAt: now,
            }).returning()
            if (!created) return redirectToError('Failed to create user account')
            user = created
        }

        if (!user) return redirectToError('Failed to resolve user account')

        // Download Google profile picture on first sign-in (never overwrite a custom avatar)
        if (userInfo.picture && !user.avatarPath) {
            try {
                const res = await fetch(userInfo.picture)
                if (res.ok) {
                    const buffer = Buffer.from(await res.arrayBuffer())
                    const resized = await sharp(buffer)
                        .resize(256, 256, { fit: 'cover', position: 'centre' })
                        .webp({ quality: 85 })
                        .toBuffer()
                    const avatarPath = await saveStorageFile(resized, `${user.id}.webp`, 'avatars')
                    await db.update(users).set({ avatarPath, updatedAt: BigInt(now) }).where(eq(users.id, user.id))
                    user = { ...user, avatarPath }
                }
            } catch {
                // Avatar fetch is best-effort; don't fail the login
            }
        }

        const accessToken = await createAccessToken(user.id)
        const pendingKey = storePendingAuth({
            accessToken,
            userId: user.id,
            name: user.name ?? userInfo.name,
            email: user.email ?? userInfo.email,
            state: statePayload,
            isNewUser,
        })

        return sendRedirect(event, `/auth/google/complete?code=${pendingKey}`, 302)
    } catch (err: any) {
        return redirectToError(err.statusMessage || err.message || 'Google sign-in failed')
    }
})
