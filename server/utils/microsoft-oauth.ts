import { randomUUID } from 'node:crypto'

const MS_AUTH_BASE = 'https://login.microsoftonline.com'
const MS_GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me'
const PENDING_TTL_MS = 5 * 60 * 1000

export interface MicrosoftUserInfo {
    id: string
    mail: string | null
    userPrincipalName: string
    displayName: string
}

interface PendingAuth {
    accessToken: string
    userId: string
    name: string
    email: string
    state: string
    expiresAt: number
    isNewUser: boolean
}

const _pending = new Map<string, PendingAuth>()

export function buildMicrosoftAuthUrl(redirectUri: string, state: string, tenantId: string = 'common'): string {
    const clientId = process.env.MICROSOFT_CLIENT_ID
    if (!clientId) throw createError({ statusCode: 500, statusMessage: 'MICROSOFT_CLIENT_ID is not configured' })
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile User.Read',
        state,
        prompt: 'select_account',
        response_mode: 'query',
    })
    return `${MS_AUTH_BASE}/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}

export async function exchangeMicrosoftCode(code: string, redirectUri: string, tenantId: string = 'common'): Promise<string> {
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    if (!clientId || !clientSecret) throw createError({ statusCode: 500, statusMessage: 'Microsoft OAuth is not configured on this server' })

    const res = await $fetch<{ access_token?: string; error?: string; error_description?: string }>(
        `${MS_AUTH_BASE}/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        }
    )

    if (!res.access_token) {
        throw createError({ statusCode: 401, statusMessage: res.error_description || res.error || 'Microsoft token exchange failed' })
    }
    return res.access_token
}

export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    return $fetch<MicrosoftUserInfo>(MS_GRAPH_ME_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
}

export function storePendingMicrosoftAuth(data: Omit<PendingAuth, 'expiresAt'>): string {
    const key = randomUUID()
    _pending.set(key, { ...data, expiresAt: Date.now() + PENDING_TTL_MS })
    return key
}

export function consumePendingMicrosoftAuth(key: string): PendingAuth | null {
    const entry = _pending.get(key)
    _pending.delete(key)
    if (!entry || entry.expiresAt < Date.now()) return null
    return entry
}
