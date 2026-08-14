import { eq } from 'drizzle-orm'
import { albums, albumCollaborators } from '../db/schema'

export async function getVisibleAlbumIds(userId: string): Promise<string[]> {
    const [ownedRows, collaboratorRows] = await Promise.all([
        db.select({ id: albums.id }).from(albums).where(eq(albums.ownerId, userId)),
        db.select({ albumId: albumCollaborators.albumId })
            .from(albumCollaborators)
            .where(eq(albumCollaborators.userId, userId)),
    ])

    const albumIds = new Set<string>([
        ...ownedRows.map(row => row.id),
        ...collaboratorRows.map(row => row.albumId),
    ])
    return [...albumIds]
}
