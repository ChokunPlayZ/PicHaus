import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import prisma from '../../../utils/prisma'
import { getAbsoluteFilePath } from '../../../utils/upload'
import { getAuthUserId, getUnixTimestamp } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const now = getUnixTimestamp()

    const photo = await prisma.photo.findUnique({
        where: { id },
        include: {
            album: {
                include: {
                    collaborators: true
                }
            }
        }
    })

    if (!photo) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Photo not found',
        })
    }

    let hasAccess = false
    if (photo.album.isPublic) {
        hasAccess = true
    } else {
        const authUserId = getAuthUserId(event)
        if (authUserId) {
            if (photo.album.ownerId === authUserId) {
                hasAccess = true
            } else {
                const isCollaborator = photo.album.collaborators.some(c => c.userId === authUserId)
                if (isCollaborator) {
                    hasAccess = true
                }
            }
        }

        if (!hasAccess) {
            const shareToken = getCookie(event, `album-access-${photo.album.id}`)
            if (shareToken) {
                const link = await prisma.shareLink.findUnique({
                    where: { token: shareToken }
                })
                if (link && link.albumId === photo.album.id && (!link.expiresAt || link.expiresAt >= now)) {
                    hasAccess = true
                }
            }
        }

        // Check group-access cookies (set when accessing via a group share link)
        if (!hasAccess) {
            const cookies = parseCookies(event)
            for (const [key, groupToken] of Object.entries(cookies)) {
                if (!key.startsWith('group-access-')) continue
                const groupId = key.slice('group-access-'.length)
                const link = await prisma.shareLink.findUnique({
                    where: { token: groupToken },
                    include: {
                        shareGroup: {
                            include: { albums: { select: { id: true } } }
                        }
                    }
                })
                if (
                    link &&
                    link.shareGroupId === groupId &&
                    (!link.expiresAt || link.expiresAt >= now) &&
                    link.shareGroup?.albums.some(a => a.id === photo.album.id)
                ) {
                    hasAccess = true
                    break
                }
            }
        }
    }

    if (!hasAccess) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
        })
    }

    if (!photo.thumbnailStoragePath) {
        return sendRedirect(event, `/api/assets/full/${id}`)
    }

    const filePath = getAbsoluteFilePath(photo.thumbnailStoragePath)

    try {
        const stats = await stat(filePath)

        setHeader(event, 'Content-Type', 'image/webp')
        setHeader(event, 'Content-Length', stats.size)
        setHeader(event, 'Cache-Control', photo.album.isPublic
            ? 'public, max-age=31536000, immutable'
            : 'private, max-age=3600')

        return sendStream(event, createReadStream(filePath))
    } catch (error) {
        return sendRedirect(event, `/api/assets/full/${id}`)
    }
})
