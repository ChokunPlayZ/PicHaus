import { eq, and, isNotNull, notInArray } from 'drizzle-orm'
import { albums, photos, shareLinks, faces, people, albumToShareGroups, users } from '../../../../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const albumId = getRouterParam(event, 'id')
    const photoId = getRouterParam(event, 'photoId')
    if (!albumId || !photoId) throw createError({ statusCode: 400, statusMessage: 'Album and photo IDs are required' })

    const authUserId = getAuthUserId(event)
    const now = getUnixTimestamp()
    let user = null
    if (authUserId) {
        user = await db.query.users.findFirst({ where: eq(users.id, authUserId) }) ?? null
    }

    const album = await db.query.albums.findFirst({
        where: eq(albums.id, albumId),
        with: { collaborators: true },
    })
    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })

    // The photo must belong to this album.
    const photo = await db.query.photos.findFirst({ where: eq(photos.id, photoId) })
    if (!photo || photo.albumId !== albumId) {
        throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
    }

    let hasAccess = false

    if (album.isPublic) {
        hasAccess = true
    } else {
        // Share-link cookie access (album link).
        const shareToken = getCookie(event, `album-access-${albumId}`)
        if (shareToken) {
            const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, shareToken) })
            if (link && link.albumId === albumId && (!link.expiresAt || link.expiresAt >= now)) {
                hasAccess = true
            }
        }

        // Share-link cookie access via a share GROUP that contains this album.
        if (!hasAccess) {
            const groupRows = await db.select({ groupId: albumToShareGroups.B })
                .from(albumToShareGroups)
                .where(eq(albumToShareGroups.A, albumId))
            for (const { groupId } of groupRows) {
                const groupToken = getCookie(event, `group-access-${groupId}`)
                if (!groupToken) continue
                const link = await db.query.shareLinks.findFirst({ where: eq(shareLinks.token, groupToken) })
                if (link && link.shareGroupId === groupId && (!link.expiresAt || link.expiresAt >= now)) {
                    hasAccess = true
                    break
                }
            }
        }

        // Owner / collaborator access.
        if (!hasAccess && user) {
            const isOwner = album.ownerId === user.id
            const isCollaborator = album.collaborators.some(c => c.userId === user.id)
            if (isOwner || isCollaborator) hasAccess = true
        }
    }

    if (!hasAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    // Distinct people with an Instagram handle, attached to this photo's faces.
    const rows = await db.selectDistinctOn([people.id], {
        id: people.id,
        name: people.name,
        instagram: people.instagram,
        representativeFaceId: people.representativeFaceId,
    })
        .from(faces)
        .innerJoin(people, eq(faces.personId, people.id))
        .where(and(
            eq(faces.photoId, photoId),
            isNotNull(people.instagram),
            notInArray(people.instagram, ['']),
        ))
        .orderBy(people.id, people.name)

    return {
        success: true,
        data: rows.map(p => ({
            id: p.id,
            name: p.name,
            instagram: p.instagram,
            representativeFaceId: p.representativeFaceId,
            representativeFaceUrl: p.representativeFaceId
                ? `/api/v1/faces/${p.representativeFaceId}/thumb`
                : null,
        })),
    }
})
