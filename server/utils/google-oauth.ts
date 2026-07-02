import { randomUUID } from 'node:crypto'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const PENDING_TTL_MS = 5 * 60 * 1000

export interface GoogleUserInfo {
    sub: string
    email: string
    email_verified: boolean
    name: string
    picture?: string
    hd?: string
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

export function buildGoogleAuthUrl(redirectUri: string, state: string, hd?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) throw createError({ statusCode: 500, statusMessage: 'GOOGLE_CLIENT_ID is not configured' })
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
        prompt: 'select_account',
    })
    if (hd) params.set('hd', hd)
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) throw createError({ statusCode: 500, statusMessage: 'Google OAuth is not configured on this server' })

    const res = await $fetch<{ access_token?: string; error?: string; error_description?: string }>(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
    })

    if (!res.access_token) {
        throw createError({ statusCode: 401, statusMessage: res.error_description || res.error || 'Google token exchange failed' })
    }
    return res.access_token
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    return $fetch<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
}

export function storePendingAuth(data: Omit<PendingAuth, 'expiresAt'>): string {
    const key = randomUUID()
    _pending.set(key, { ...data, expiresAt: Date.now() + PENDING_TTL_MS })
    return key
}

export function consumePendingAuth(key: string): PendingAuth | null {
    const entry = _pending.get(key)
    _pending.delete(key)
    if (!entry || entry.expiresAt < Date.now()) return null
    return entry
}
