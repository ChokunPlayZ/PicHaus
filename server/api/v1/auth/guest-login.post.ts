import { eq, and, desc, inArray, sql, count, arrayOverlaps } from 'drizzle-orm'
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

            // Resolve explicit + tag-based albums
            const [explicitRows, tagRows] = await Promise.all([
                db.select({ id: albums.id, title: albums.title, description: albums.description, eventDate: albums.eventDate, coverPhotoId: albums.coverPhotoId })
                    .from(albums)
                    .innerJoin(albumToShareGroups, and(eq(albumToShareGroups.B, shareLink.shareGroupId), eq(albumToShareGroups.A, albums.id))),
                group.tags.length > 0
                    ? db.select({ id: albums.id, title: albums.title, description: albums.description, eventDate: albums.eventDate, coverPhotoId: albums.coverPhotoId })
                        .from(albums)
                        .where(and(eq(albums.ownerId, group.ownerId), arrayOverlaps(albums.tags, group.tags)))
                    : Promise.resolve([]),
            ])

            const seen = new Set<string>()
            const allRows = [...explicitRows, ...tagRows].filter(a => {
                if (seen.has(a.id)) return false
                seen.add(a.id)
                return true
            })

            const albumIds = allRows.map(a => a.id)
            const coverIds = allRows.map(a => a.coverPhotoId).filter(Boolean) as string[]
            const noCoverIds = allRows.filter(a => !a.coverPhotoId).map(a => a.id)

            const [countRows, coverRows, fallbackRows] = await Promise.all([
                albumIds.length > 0
                    ? db.select({ albumId: photos.albumId, photoCount: count() }).from(photos).where(inArray(photos.albumId, albumIds)).groupBy(photos.albumId)
                    : Promise.resolve([]),
                coverIds.length > 0
                    ? db.select({ id: photos.id, blurhash: photos.blurhash }).from(photos).where(inArray(photos.id, coverIds))
                    : Promise.resolve([]),
                noCoverIds.length > 0
                    ? db.selectDistinctOn([photos.albumId], { albumId: photos.albumId, id: photos.id, blurhash: photos.blurhash })
                        .from(photos).where(inArray(photos.albumId, noCoverIds))
                        .orderBy(photos.albumId, sql`CASE WHEN ${photos.width} > ${photos.height} THEN 0 WHEN ${photos.width} = ${photos.height} THEN 1 ELSE 2 END`, desc(photos.createdAt))
                    : Promise.resolve([]),
            ])

            const countMap = new Map(countRows.map(r => [r.albumId, r.photoCount]))
            const coverMap = new Map(coverRows.map(p => [p.id, p]))
            const fallbackMap = new Map(fallbackRows.map(p => [p.albumId!, { id: p.id, blurhash: p.blurhash }]))

            return {
                success: true,
                data: {
                    type: 'group',
                    groupId: shareLink.shareGroupId,
                    title: group.title,
                    description: group.description,
                    ownerName: group.owner.name,
                    themePreset: group.themePreset,
                    customTheme: group.customTheme,
                    logoText: group.logoText,
                    logoImageId: group.logoImageId,
                    albums: allRows.map(album => ({
                        id: album.id,
                        name: album.title,
                        description: album.description,
                        eventDate: album.eventDate ? Number(album.eventDate) : null,
                        photoCount: countMap.get(album.id) ?? 0,
                        coverPhoto: album.coverPhotoId
                            ? (coverMap.get(album.coverPhotoId) ?? null)
                            : (fallbackMap.get(album.id) ?? null),
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
