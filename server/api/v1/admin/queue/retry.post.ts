import { requireAuth } from '../../../../utils/auth'
import { retryFailedJobs } from '../../../../utils/queue'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const body = await readBody(event).catch(() => ({}))
    const retryAll = !Array.isArray(body?.jobIds)
    const jobIds = Array.isArray(body?.jobIds)
        ? body.jobIds.filter((id: unknown): id is string => typeof id === 'string')
        : undefined

    if (!retryAll && jobIds && jobIds.length === 0) {
        return { success: true, retried: 0 }
    }

    const retried = await retryFailedJobs(retryAll ? undefined : jobIds)
    return { success: true, retried }
})
