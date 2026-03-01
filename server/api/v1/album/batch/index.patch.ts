import prisma from '../../../../utils/prisma'
import { getUnixTimestamp, requireAuth } from '../../../../utils/auth'

type VisibilityAction = 'keep' | 'public' | 'private'
type TagAction = 'none' | 'replace' | 'add' | 'remove'

const normalizeTags = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []

    const normalized = value
        .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(tag => tag.length > 0)

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
            throw createError({
                statusCode: 400,
                statusMessage: 'At least one album ID is required',
            })
        }

        const visibilityAction: VisibilityAction = ['keep', 'public', 'private'].includes(body.visibilityAction)
            ? body.visibilityAction
            : 'keep'

        const tagAction: TagAction = ['none', 'replace', 'add', 'remove'].includes(body.tagAction)
            ? body.tagAction
            : 'none'

        const tags = normalizeTags(body.tags)

        if (tagAction !== 'none' && tags.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Tags are required for the selected tag action',
            })
        }

        if (visibilityAction === 'keep' && tagAction === 'none') {
            throw createError({
                statusCode: 400,
                statusMessage: 'No changes provided',
            })
        }

        const albums = await prisma.album.findMany({
            where: {
                id: { in: albumIds },
            },
            include: {
                collaborators: {
                    where: {
                        userId: user.id,
                        role: {
                            in: ['admin', 'editor'],
                        },
                    },
                    select: {
                        id: true,
                    },
                },
            },
        })

        if (albums.length !== albumIds.length) {
            throw createError({
                statusCode: 404,
                statusMessage: 'One or more albums were not found',
            })
        }

        const editableAlbums = albums.filter((album) => {
            const isOwner = album.ownerId === user.id
            const isEditorCollaborator = album.collaborators.length > 0
            return isOwner || isEditorCollaborator
        })

        if (editableAlbums.length !== albums.length) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have permission to edit one or more selected albums',
            })
        }

        const now = getUnixTimestamp()

        await prisma.$transaction(
            editableAlbums.map((album) => {
                let nextTags = album.tags

                if (tagAction === 'replace') {
                    nextTags = tags
                } else if (tagAction === 'add') {
                    nextTags = Array.from(new Set([...(album.tags || []), ...tags]))
                } else if (tagAction === 'remove') {
                    const removeSet = new Set(tags)
                    nextTags = (album.tags || []).filter(tag => !removeSet.has(tag))
                }

                return prisma.album.update({
                    where: { id: album.id },
                    data: {
                        updatedAt: now,
                        isPublic: visibilityAction === 'keep'
                            ? album.isPublic
                            : visibilityAction === 'public',
                        tags: nextTags,
                    },
                })
            })
        )

        return {
            success: true,
            message: 'Albums updated successfully',
            data: {
                updatedCount: editableAlbums.length,
            },
        }
    } catch (error: any) {
        console.error('Error batch updating albums:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to batch update albums',
        })
    }
})
