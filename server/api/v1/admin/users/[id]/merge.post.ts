import { eq, and, inArray } from 'drizzle-orm'
import { users, photos, albums, shareGroups, passkeys, apiTokens, inviteTokens, logos, albumCollaborators } from '../../../../../db/schema'
import { requireAuth } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const currentUser = await requireAuth(event)
    if (currentUser.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const keepId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const deleteId: string | undefined = body?.deleteId

    if (!keepId || !deleteId) throw createError({ statusCode: 400, statusMessage: 'keepId and deleteId are required' })
    if (keepId === deleteId) throw createError({ statusCode: 400, statusMessage: 'Cannot merge a user into themselves' })
    if (deleteId === currentUser.id) throw createError({ statusCode: 400, statusMessage: 'Cannot delete your own account via merge' })

    const [keepUser, deleteUser] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, keepId), columns: { id: true, name: true } }),
        db.query.users.findFirst({ where: eq(users.id, deleteId), columns: { id: true, name: true } }),
    ])

    if (!keepUser) throw createError({ statusCode: 404, statusMessage: 'Target user not found' })
    if (!deleteUser) throw createError({ statusCode: 404, statusMessage: 'Duplicate user not found' })

    await db.transaction(async (tx) => {
        // albumCollaborators has a unique constraint on (albumId, userId).
        // Find albums where both users are already collaborators and delete the duplicate's rows first.
        const keepCollabAlbums = await tx
            .select({ albumId: albumCollaborators.albumId })
            .from(albumCollaborators)
            .where(eq(albumCollaborators.userId, keepId))

        if (keepCollabAlbums.length > 0) {
            const conflictingAlbumIds = keepCollabAlbums.map(r => r.albumId)
            await tx.delete(albumCollaborators).where(
                and(
                    eq(albumCollaborators.userId, deleteId),
                    inArray(albumCollaborators.albumId, conflictingAlbumIds),
                )
            )
        }

        await Promise.all([
            tx.update(albumCollaborators).set({ userId: keepId }).where(eq(albumCollaborators.userId, deleteId)),
            tx.update(photos).set({ uploaderId: keepId }).where(eq(photos.uploaderId, deleteId)),
            tx.update(albums).set({ ownerId: keepId }).where(eq(albums.ownerId, deleteId)),
            tx.update(shareGroups).set({ ownerId: keepId }).where(eq(shareGroups.ownerId, deleteId)),
            tx.update(passkeys).set({ userId: keepId }).where(eq(passkeys.userId, deleteId)),
            tx.update(apiTokens).set({ userId: keepId }).where(eq(apiTokens.userId, deleteId)),
            tx.update(inviteTokens).set({ userId: keepId }).where(eq(inviteTokens.userId, deleteId)),
            tx.update(logos).set({ uploadedById: keepId }).where(eq(logos.uploadedById, deleteId)),
        ])

        await tx.delete(users).where(eq(users.id, deleteId))
    })

    return {
        success: true,
        message: `Merged "${deleteUser.name ?? deleteId}" into "${keepUser.name ?? keepId}"`,
    }
})
