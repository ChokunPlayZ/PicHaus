import { eq, inArray } from 'drizzle-orm'
import { albums } from '../../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../../utils/auth'
import { normalizeTags } from '../../../../utils/albums'

type VisibilityAction = 'keep' | 'public' | 'private'
type TagAction = 'none' | 'replace' | 'add' | 'remove'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)

        const albumIds = Array.isArray(body.albumIds)
            ? body.albumIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : []

        if (albumIds.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'At least one album ID is required' })
        }

        const visibilityAction: VisibilityAction = ['keep', 'public', 'private'].includes(body.visibilityAction)
            ? body.visibilityAction : 'keep'
        const tagAction: TagAction = ['none', 'replace', 'add', 'remove'].includes(body.tagAction)
            ? body.tagAction : 'none'
        const tags = normalizeTags(body.tags)

        if (tagAction !== 'none' && tags.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Tags are required for the selected tag action' })
        }
        if (visibilityAction === 'keep' && tagAction === 'none') {
            throw createError({ statusCode: 400, statusMessage: 'No changes provided' })
        }

        const albumRows = await db.query.albums.findMany({
            where: inArray(albums.id, albumIds),
        })

        if (albumRows.length !== albumIds.length) {
            throw createError({ statusCode: 404, statusMessage: 'One or more albums were not found' })
        }

        const isOwnerOfAll = albumRows.every(album => album.ownerId === user.id)
        if (!isOwnerOfAll) {
            throw createError({ statusCode: 403, statusMessage: 'Only the album owner can edit these albums' })
        }

        if (!user.email) {
            throw createError({ statusCode: 403, statusMessage: 'Guest users cannot edit albums until they have an email assigned' })
        }

        const editableAlbums = albumRows

        const now = getUnixTimestamp()

        await db.transaction(async (tx) => {
            for (const album of editableAlbums) {
                let nextTags = album.tags
                if (tagAction === 'replace') nextTags = tags
                else if (tagAction === 'add') nextTags = Array.from(new Set([...(album.tags || []), ...tags]))
                else if (tagAction === 'remove') {
                    const removeSet = new Set(tags)
                    nextTags = (album.tags || []).filter(tag => !removeSet.has(tag))
                }

                await tx.update(albums).set({
                    updatedAt: now,
                    isPublic: visibilityAction === 'keep' ? album.isPublic : visibilityAction === 'public',
                    tags: nextTags,
                }).where(eq(albums.id, album.id))
            }
        })

        return { success: true, message: 'Albums updated successfully', data: { updatedCount: editableAlbums.length } }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to batch update albums' })
    }
})
