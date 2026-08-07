import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enforceRateLimit, refundRateLimit, resetRateLimitsForTests } from '../server/utils/rate-limit'

function testEvent(address = '127.0.0.1') {
    return {
        node: {
            req: {
                socket: { remoteAddress: address },
            },
        },
        headers: new Map<string, string>(),
    }
}

describe('rate limit accounting', () => {
    beforeEach(() => {
        resetRateLimitsForTests()
        ;(globalThis as any).createError = (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details)
        ;(globalThis as any).getRequestHeader = () => undefined
        ;(globalThis as any).setResponseHeader = (event: ReturnType<typeof testEvent>, name: string, value: string) => {
            event.headers.set(name, value)
        }
    })

    afterEach(() => {
        resetRateLimitsForTests()
    })

    it('limits attempts that are not refunded', () => {
        const event = testEvent()
        const options = { key: 'test-limit', limit: 1, windowMs: 60_000 }

        enforceRateLimit(event, options)

        expect(() => enforceRateLimit(event, options)).toThrow('Too many requests. Please try again later.')
    })

    it('refunds successful attempts so they do not consume the limit', () => {
        const event = testEvent()
        const options = { key: 'test-refund', limit: 1, windowMs: 60_000 }

        enforceRateLimit(event, options)
        refundRateLimit(event, options)

        expect(() => enforceRateLimit(event, options)).not.toThrow()
        expect(event.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
})
