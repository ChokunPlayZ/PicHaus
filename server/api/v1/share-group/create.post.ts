import prisma from '../../../utils/prisma'
import { hashPassword, getUnixTimestamp, requireAuth } from '../../../utils/auth'

import crypto from 'crypto'

/**
 * Create a new share group
 */
export default defineEventHandler(async (event) => {
    try {
        // Get authenticated user
        const user = await requireAuth(event)

        const body = await readBody(event)
        const { title, description, albumIds, isPublic, password, type, label } = body

        if (!title) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Title is required',
            })
        }

        if (!albumIds || !Array.isArray(albumIds) || albumIds.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'At least one album must be selected',
            })
        }

        const now = getUnixTimestamp()

        // Verify albums exist and user owns them
        const albums = await prisma.album.findMany({
            where: {
                id: { in: albumIds },
                ownerId: user.id
            }
        })

        if (albums.length !== albumIds.length) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You can only share albums you own',
            })
        }

        // Create ShareGroup
        const shareGroup = await prisma.shareGroup.create({
            data: {
                title,
                description: description || null,
                ownerId: user.id,
                createdAt: now,
                updatedAt: now,
                albums: {
                    connect: albumIds.map(id => ({ id }))
                }
            }
        })

        // Generate ShareLink for the group
        const token = crypto.randomBytes(32).toString('hex')
        const linkData: any = {
            token,
            type: type || 'view',
            label: label || 'Public Link',
            views: 0,
            shareGroupId: shareGroup.id,
            createdAt: now,
        }

        if (password) {
            linkData.password = await hashPassword(password)
        }

        const shareLink = await prisma.shareLink.create({
            data: linkData
        })

        return {
            success: true,
            data: {
                group: {
                    id: shareGroup.id,
                    title: shareGroup.title,
                    description: shareGroup.description,
                    createdAt: Number(shareGroup.createdAt),
                    updatedAt: Number(shareGroup.updatedAt),
                    albumsCount: albums.length
                },
                link: {
                    token: shareLink.token,
                    url: `/v/${shareLink.token}`
                }
            },
        }

    } catch (error: any) {
        console.error('Error creating share group:', error)
        if (error.statusCode) {
            throw error
        }
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create share group',
        })
    }
})
