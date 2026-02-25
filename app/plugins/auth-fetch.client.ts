import { clearAuthToken, getAuthToken } from '~/utils/auth-client'

function shouldAttachAuth(requestUrl: string): boolean {
    if (requestUrl.startsWith('/api/')) {
        return true
    }

    if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
        return false
    }

    try {
        const parsedUrl = new URL(requestUrl)
        return parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/')
    } catch {
        return false
    }
}

function withAuthHeader(headers: HeadersInit | undefined): Headers {
    const nextHeaders = new Headers(headers || {})
    const token = getAuthToken()

    if (token && !nextHeaders.has('Authorization')) {
        nextHeaders.set('Authorization', `Bearer ${token}`)
    }

    return nextHeaders
}

export default defineNuxtPlugin((nuxtApp) => {
    const authFetch = $fetch.create({
        onRequest({ request, options }) {
            const requestUrl = typeof request === 'string' ? request : request.toString()
            if (!shouldAttachAuth(requestUrl)) {
                return
            }

            options.headers = withAuthHeader(options.headers as HeadersInit | undefined)
        },
        onResponseError({ request, response }) {
            const requestUrl = typeof request === 'string' ? request : request.toString()

            if (response.status === 401 && requestUrl.includes('/api/v1/auth/me')) {
                clearAuthToken()
            }
        },
    })

    globalThis.$fetch = authFetch as typeof $fetch
    ;(nuxtApp as any).$fetch = authFetch

    const nativeFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const requestUrl = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url

        if (!shouldAttachAuth(requestUrl)) {
            return nativeFetch(input, init)
        }

        const existingHeaders = init?.headers || (input instanceof Request ? input.headers : undefined)

        const nextInit: RequestInit = {
            ...init,
            headers: withAuthHeader(existingHeaders),
        }

        return nativeFetch(input, nextInit)
    }
})
