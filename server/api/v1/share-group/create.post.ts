import { eq, inArray, and } from 'drizzle-orm'
import { albums, shareGroups, shareLinks, albumToShareGroups } from '../../../db/schema'
import { hashPassword, getUnixTimestamp, requireAuth } from '../../../utils/auth'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)
        const { title, description, albumIds, password, type, label } = body

        if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
        if (!albumIds || !Array.isArray(albumIds) || albumIds.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'At least one album must be selected' })
        }

        const now = getUnixTimestamp()

        const ownedAlbums = await db.select({ id: albums.id })
            .from(albums)
            .where(and(inArray(albums.id, albumIds), eq(albums.ownerId, user.id)))

        if (ownedAlbums.length !== albumIds.length) {
            throw createError({ statusCode: 403, statusMessage: 'You can only share albums you own' })
        }

        const [shareGroup] = await db.insert(shareGroups).values({
            title,
            description: description || null,
            ownerId: user.id,
            createdAt: now,
            updatedAt: now,
        }).returning()

        await db.insert(albumToShareGroups).values(
            albumIds.map((id: string) => ({ A: id, B: shareGroup.id }))
        )

        const token = crypto.randomBytes(32).toString('hex')
        const linkData: Partial<typeof shareLinks.$inferInsert> = {
            token,
            type: type || 'view',
            label: label || 'Public Link',
            views: 0,
            shareGroupId: shareGroup.id,
            createdAt: now,
        }
        if (password) linkData.password = await hashPassword(password)

        const [shareLink] = await db.insert(shareLinks).values(linkData as typeof shareLinks.$inferInsert).returning()

        return {
            success: true,
            data: {
                group: {
                    id: shareGroup.id,
                    title: shareGroup.title,
                    description: shareGroup.description,
                    createdAt: Number(shareGroup.createdAt),
                    updatedAt: Number(shareGroup.updatedAt),
                    albumsCount: ownedAlbums.length,
                },
                link: { token: shareLink.token, url: `/v/${shareLink.token}` },
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to create share group' })
    }
})
