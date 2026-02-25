import prisma from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const shareLinks = await prisma.shareLink.findMany({
        where: {
            OR: [
                {
                    album: {
                        ownerId: user.id
                    }
                },
                {
                    shareGroup: {
                        ownerId: user.id
                    }
                }
            ]
        },
        include: {
            album: {
                select: {
                    id: true,
                    title: true,
                    ownerId: true
                }
            },
            shareGroup: {
                select: {
                    id: true,
                    title: true,
                    ownerId: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return {
        success: true,
        data: shareLinks.map(link => {
            const isGroup = !!link.shareGroupId
            const targetName = isGroup ? link.shareGroup?.title : link.album?.title
            const url = !isGroup && link.type === 'upload' ? `/u/${link.token}` : `/v/${link.token}`

            return {
                id: link.id,
                token: link.token,
                type: link.type,
                targetType: isGroup ? 'Group' : 'Album',
                targetName: targetName || 'Unknown',
                label: link.label,
                views: link.views,
                createdAt: link.createdAt ? Number(link.createdAt) : null,
                expiresAt: link.expiresAt ? Number(link.expiresAt) : null,
                hasPassword: !!link.password,
                showMetadata: link.showMetadata,
                url
            }
        })
    }
})
