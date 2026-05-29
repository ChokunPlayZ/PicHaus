import { eq, and, inArray } from 'drizzle-orm'
import { albums, albumCollaborators } from '../../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../../utils/auth'

type VisibilityAction = 'keep' | 'public' | 'private'
type TagAction = 'none' | 'replace' | 'add' | 'remove'

const normalizeTags = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const normalized = value.map(tag => (typeof tag === 'string' ? tag.trim() : '')).filter(tag => tag.length > 0)
    return Array.from(new Set(normalized))
}

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
            with: {
                collaborators: {
                    where: and(eq(albumCollaborators.userId, user.id), inArray(albumCollaborators.role, ['admin', 'editor'])),
                },
            },
        })

        if (albumRows.length !== albumIds.length) {
            throw createError({ statusCode: 404, statusMessage: 'One or more albums were not found' })
        }

        const editableAlbums = albumRows.filter(album => album.ownerId === user.id || album.collaborators.length > 0)

        if (editableAlbums.length !== albumRows.length) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to edit one or more selected albums' })
        }

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
