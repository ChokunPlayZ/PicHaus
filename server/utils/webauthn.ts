import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'

export {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
}
export type { AuthenticatorTransportFuture }

export const getRpConfig = () => ({
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    rpName: process.env.WEBAUTHN_RP_NAME || 'PicHaus',
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
})

// In-memory challenge store (suitable for single-instance deployment)
// Each entry expires after 5 minutes
interface ChallengeEntry {
    challenge: string
    userId?: string   // set for registration; absent for discoverable-credential login
    expiresAt: number
}

const store = new Map<string, ChallengeEntry>()

// Prune expired entries every minute
setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store) {
        if (v.expiresAt < now) store.delete(k)
    }
}, 60_000)

export const saveChallenge = (challenge: string, userId?: string): string => {
    const id = crypto.randomUUID()
    store.set(id, { challenge, userId, expiresAt: Date.now() + 5 * 60 * 1000 })
    return id
}

export const consumeChallenge = (id: string): ChallengeEntry | null => {
    const entry = store.get(id)
    store.delete(id)
    if (!entry || entry.expiresAt < Date.now()) return null
    return entry
}

// Human-readable label for a transport value
export const transportLabel = (t: string): string => ({
    usb: 'USB',
    nfc: 'NFC',
    ble: 'Bluetooth',
    'smart-card': 'Smart Card',
    'hybrid': 'Hybrid',
    internal: 'Built-in',
}[t] ?? t)
