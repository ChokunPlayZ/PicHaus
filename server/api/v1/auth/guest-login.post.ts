import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { users, shareLinks, shareGroups, albumCollaborators, albums, photos, albumToShareGroups } from '../../../db/schema'
import { getUnixTimestamp, getAuthUserId, createAccessToken } from '../../../utils/auth'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { token, password } = body
        let { name, email, instagram } = body
        const now = getUnixTimestamp()

        if (!token) {
            throw createError({ statusCode: 400, statusMessage: 'Token is required' })
        }

        const shareLink = await db.query.shareLinks.findFirst({
            where: eq(shareLinks.token, token),
            with: {
                album: { with: { owner: true } },
                shareGroup: true,
            },
        })

        if (!shareLink) {
            throw createError({ statusCode: 404, statusMessage: 'Invalid link' })
        }

        if (shareLink.expiresAt && shareLink.expiresAt < now) {
            throw createError({ statusCode: 404, statusMessage: 'Invalid link' })
        }

        if (shareLink.password) {
            if (!password) throw createError({ statusCode: 401, statusMessage: 'Password required' })
            const valid = await argon2.verify(shareLink.password, password)
            if (!valid) throw createError({ statusCode: 401, statusMessage: 'Invalid password' })
        }

        await db.update(shareLinks)
            .set({ views: sql`${shareLinks.views} + 1` })
            .where(eq(shareLinks.id, shareLink.id))

        // Handle Share Group
        if (shareLink.shareGroupId && shareLink.shareGroup) {
            setCookie(event, `group-access-${shareLink.shareGroupId}`, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            })

            const group = await db.query.shareGroups.findFirst({
                where: eq(shareGroups.id, shareLink.shareGroupId),
                with: { owner: true },
            })

            if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

            // Get albums for this group via junction table
            const groupAlbumRows = await db
                .select({
                    id: albums.id,
                    title: albums.title,
                    description: albums.description,
                    eventDate: albums.eventDate,
                    photoCount: sql<number>`(SELECT COUNT(*) FROM photos WHERE photos."albumId" = ${albums.id})`,
                })
                .from(albums)
                .innerJoin(albumToShareGroups, and(
                    eq(albumToShareGroups.B, shareLink.shareGroupId),
                    eq(albumToShareGroups.A, albums.id),
                ))

            // Get first photo per album
            const albumIds = groupAlbumRows.map(a => a.id)
            const firstPhotos = albumIds.length > 0
                ? await db.select({ albumId: photos.albumId, id: photos.id, blurhash: photos.blurhash })
                    .from(photos)
                    .where(inArray(photos.albumId, albumIds))
                    .orderBy(desc(photos.createdAt))
                : []
            const firstPhotoByAlbum = new Map<string, { id: string; blurhash: string }>()
            for (const p of firstPhotos) {
                if (!firstPhotoByAlbum.has(p.albumId)) {
                    firstPhotoByAlbum.set(p.albumId, { id: p.id, blurhash: p.blurhash })
                }
            }

            return {
                success: true,
                data: {
                    type: 'group',
                    groupId: shareLink.shareGroupId,
                    title: group.title,
                    description: group.description,
                    ownerName: group.owner.name,
                    albums: groupAlbumRows.map(album => ({
                        id: album.id,
                        name: album.title,
                        description: album.description,
                        eventDate: album.eventDate ? Number(album.eventDate) : null,
                        photoCount: Number(album.photoCount),
                        coverPhoto: firstPhotoByAlbum.get(album.id) || null,
                    })),
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        if (!shareLink.albumId || !shareLink.album) {
            throw createError({ statusCode: 404, statusMessage: 'Album not found' })
        }

        if (shareLink.type === 'view') {
            setCookie(event, `album-access-${shareLink.albumId}`, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            })
            return {
                success: true,
                data: {
                    albumId: shareLink.albumId,
                    albumName: shareLink.album.title,
                    type: 'view',
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        // Upload link — find or create user
        const authUserId = getAuthUserId(event)
        let user: typeof users.$inferSelect | null = null

        if (authUserId) {
            user = await db.query.users.findFirst({ where: eq(users.id, authUserId) }) ?? null
        }

        if (!user) {
            if (email) {
                const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) }) ?? null
                if (existingUser) {
                    if (existingUser.passwordHash) {
                        if (!body.accountPassword) {
                            throw createError({ statusCode: 401, statusMessage: 'This email is registered. Please provide your account password.' })
                        }
                        const valid = await argon2.verify(existingUser.passwordHash, body.accountPassword)
                        if (!valid) throw createError({ statusCode: 401, statusMessage: 'Incorrect password' })
                    }
                    user = existingUser
                    if (instagram && !user.instagram) {
                        const [updated] = await db.update(users).set({ instagram }).where(eq(users.id, user.id)).returning()
                        user = updated
                    }
                } else {
                    const [created] = await db.insert(users).values({
                        email,
                        name: name || email.split('@')[0],
                        instagram: instagram || null,
                        createdAt: getUnixTimestamp(),
                        updatedAt: getUnixTimestamp(),
                    }).returning()
                    user = created
                }
            } else {
                const [created] = await db.insert(users).values({
                    name: name || 'Guest',
                    instagram: instagram || null,
                    createdAt: getUnixTimestamp(),
                    updatedAt: getUnixTimestamp(),
                }).returning()
                user = created
            }
        }

        const existingCollab = await db.query.albumCollaborators.findFirst({
            where: and(
                eq(albumCollaborators.albumId, shareLink.albumId),
                eq(albumCollaborators.userId, user.id),
            ),
        })

        if (!existingCollab) {
            await db.insert(albumCollaborators).values({
                albumId: shareLink.albumId,
                userId: user.id,
                role: 'editor',
                createdAt: getUnixTimestamp(),
            })
        }

        const accessToken = await createAccessToken(user.id)

        return {
            success: true,
            data: {
                accessToken,
                id: user.id,
                name: user.name,
                email: user.email,
                albumId: shareLink.albumId,
                albumName: shareLink.album.title,
                description: shareLink.album.description,
                eventDate: shareLink.album.eventDate ? Number(shareLink.album.eventDate) : null,
                ownerName: shareLink.album.owner?.name || null,
                showMetadata: shareLink.showMetadata,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to login' })
    }
})
