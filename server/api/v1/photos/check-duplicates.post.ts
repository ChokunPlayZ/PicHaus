import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    // Require authentication
    const user = await requireAuth(event)

    const body = await readBody(event)
    const { hashes } = body

    if (!hashes || !Array.isArray(hashes)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Hashes array is required',
        })
    }

    // Limit batch size
    if (hashes.length > 500) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Batch size too large (max 500)',
        })
    }

    // Find existing photos with these hashes (uploaded by this user or any user depending on policy)
    // For now, let's assume global deduplication or per-user. The Photo model has fileHash.
    // If we want to prevent re-uploading the exact same file content globally, we check globally.
    // However, privacy-wise, maybe we only check user's or album's?
    // Let's check globally for efficiency (save storage) but user context might matter.
    // Given the requirement is "on device so it's faster", checking globally is most efficient for storage.

    // Check if hashes exist in database
    const existingPhotos = await prisma.photo.findMany({
        where: {
            fileHash: {
                in: hashes
            }
        },
        select: {
            fileHash: true
        },
        distinct: ['fileHash']
    })

    const duplicates = existingPhotos.map(p => p.fileHash)

    return {
        success: true,
        duplicates
    }
})
