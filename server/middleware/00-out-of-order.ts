import { assertSystemHealthy, getSystemOutage, OUT_OF_ORDER_MESSAGE } from '../utils/system-health'

export default defineEventHandler(async (event) => {
    await assertSystemHealthy()

    if (!getSystemOutage()) return

    setResponseStatus(event, 503)
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-store')
    return OUT_OF_ORDER_MESSAGE
})
