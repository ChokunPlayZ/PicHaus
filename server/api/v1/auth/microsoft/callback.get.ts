import { eq, or } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { users, siteSettings } from '../../../../db/schema'
import { createAccessToken, getUnixTimestamp } from '../../../../utils/auth'
import { exchangeMicrosoftCode, getMicrosoftUserInfo, storePendingMicrosoftAuth } from '../../../../utils/microsoft-oauth'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const code = typeof query.code === 'string' ? query.code : ''
    const state = typeof query.state === 'string' ? query.state : ''

    const redirectToError = (msg: string) =>
        sendRedirect(event, `/auth/microsoft/complete?error=${encodeURIComponent(msg)}`, 302)

    if (!code) return redirectToError('No authorization code received from Microsoft')

    try {
        const requestUrl = getRequestURL(event)
        const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/v1/auth/microsoft/callback`

        const rows = await db
            .select({ microsoftOAuthTenantId: siteSettings.microsoftOAuthTenantId })
            .from(siteSettings)
            .where(eq(siteSettings.id, 1))
            .limit(1)

        const tenantId = rows[0]?.microsoftOAuthTenantId || 'common'

        const msAccessToken = await exchangeMicrosoftCode(code, redirectUri, tenantId)
        const userInfo = await getMicrosoftUserInfo(msAccessToken)

        const email = userInfo.mail || userInfo.userPrincipalName
        if (!email) return redirectToError('Microsoft account has no email address')

        type DbUser = typeof users.$inferSelect
        let user: DbUser | null = await db.query.users.findFirst({
            where: or(eq(users.microsoftId, userInfo.id), eq(users.email, email)),
        }).then(r => r ?? null)

        const now = getUnixTimestamp()

        if (user) {
            if (!user.microsoftId) {
                const [updated] = await db.update(users)
                    .set({ microsoftId: userInfo.id, updatedAt: now })
                    .where(eq(users.id, user.id))
                    .returning()
                if (updated) user = updated
            }
        } else {
            const [created] = await db.insert(users).values({
                email,
                name: userInfo.displayName || email.split('@')[0],
                microsoftId: userInfo.id,
                createdAt: now,
                updatedAt: now,
            }).returning()
            if (!created) return redirectToError('Failed to create user account')
            user = created
        }

        if (!user) return redirectToError('Failed to resolve user account')

        // Download Microsoft profile photo on first sign-in (never overwrite a custom avatar)
        if (!user.avatarPath) {
            try {
                const photoRes = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                    headers: { Authorization: `Bearer ${msAccessToken}` },
                })
                if (photoRes.ok) {
                    const buffer = Buffer.from(await photoRes.arrayBuffer())
                    const resized = await sharp(buffer)
                        .resize(256, 256, { fit: 'cover', position: 'centre' })
                        .webp({ quality: 85 })
                        .toBuffer()
                    const storageBase = process.env.STORAGE_DIR || 'storage/uploads'
                    const avatarDir = join(process.cwd(), storageBase, 'avatars')
                    await mkdir(avatarDir, { recursive: true })
                    await writeFile(join(avatarDir, `${user.id}.webp`), resized)
                    const avatarPath = `avatars/${user.id}.webp`
                    await db.update(users).set({ avatarPath, updatedAt: BigInt(now) }).where(eq(users.id, user.id))
                    user = { ...user, avatarPath }
                }
            } catch {
                // Avatar fetch is best-effort; don't fail the login
            }
        }

        const accessToken = await createAccessToken(user.id)
        const pendingKey = storePendingMicrosoftAuth({
            accessToken,
            userId: user.id,
            name: user.name ?? userInfo.displayName,
            email: user.email ?? email,
            state,
        })

        return sendRedirect(event, `/auth/microsoft/complete?code=${pendingKey}`, 302)
    } catch (err: any) {
        return redirectToError(err.statusMessage || err.message || 'Microsoft sign-in failed')
    }
})
