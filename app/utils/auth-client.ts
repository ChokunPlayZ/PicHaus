const AUTH_TOKEN_STORAGE_KEY = 'pichaus_access_token'

export function getAuthToken(): string | null {
    if (!process.client) {
        return null
    }

    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string): void {
    if (!process.client) {
        return
    }

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken(): void {
    if (!process.client) {
        return
    }

    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function buildAssetUrl(path: string): string {
    if (!process.client) {
        return path
    }

    const token = getAuthToken()
    if (!token) {
        return path
    }

    try {
        const url = new URL(path, window.location.origin)
        url.searchParams.set('access_token', token)
        return url.pathname + url.search
    } catch {
        return path
    }
}
