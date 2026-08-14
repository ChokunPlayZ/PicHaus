import { eq } from 'drizzle-orm'
import { photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { enqueueJob, type JobType } from '../../../utils/queue'

const SCOPES = ['faces', 'thumbnails', 'metadata'] as const
type ReprocessScope = typeof SCOPES[number]

function jobTypeForScope(scope: ReprocessScope): JobType {
    if (scope === 'faces') return 'face-detection'
    if (scope === 'thumbnails') return 'thumbnail'
    return 'metadata'
}

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const body = await readBody(event)
    const scope = body?.scope as string | undefined
    const albumId = typeof body?.albumId === 'string' && body.albumId ? body.albumId : undefined

    if (!scope || !SCOPES.includes(scope as ReprocessScope)) {
        throw createError({ statusCode: 400, statusMessage: 'scope must be one of: faces, thumbnails, metadata' })
    }

    const photoRows = await db.select({
        id: photos.id,
        storagePath: photos.storagePath,
        originalName: photos.originalName,
        mimeType: photos.mimeType,
    })
        .from(photos)
        .where(albumId ? eq(photos.albumId, albumId) : undefined)

    const jobType = jobTypeForScope(scope as ReprocessScope)
    for (const photo of photoRows) {
        const payload: Record<string, unknown> = {
            photoId: photo.id,
            storagePath: photo.storagePath,
        }
        if (jobType === 'metadata') {
            payload.originalFilename = photo.originalName
            payload.mimeType = photo.mimeType
        }
        await enqueueJob(jobType, payload)
    }

    return { success: true, enqueued: photoRows.length }
})
