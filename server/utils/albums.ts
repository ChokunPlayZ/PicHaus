import { eq } from 'drizzle-orm'
import { users } from '../db/schema'

type AlbumVisibilityFlags = {
    isPublic: boolean
    isCommunity: boolean
}

export function resolveAlbumVisibility(
    body: { visibility?: unknown; isPublic?: unknown; isCommunity?: unknown },
    current: AlbumVisibilityFlags = { isPublic: false, isCommunity: false },
): AlbumVisibilityFlags {
    if (body.visibility !== undefined) {
        if (!['private', 'community', 'public'].includes(body.visibility as string)) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid album visibility' })
        }
        return { isPublic: body.visibility === 'public', isCommunity: body.visibility === 'community' }
    }

    for (const key of ['isPublic', 'isCommunity'] as const) {
        if (body[key] !== undefined && typeof body[key] !== 'boolean') {
            throw createError({ statusCode: 400, statusMessage: `${key} must be a boolean` })
        }
    }
    if (body.isPublic === true && body.isCommunity === true) {
        throw createError({ statusCode: 400, statusMessage: 'Choose either public or community visibility' })
    }
    if (body.isPublic === true) return { isPublic: true, isCommunity: false }
    if (body.isCommunity === true) return { isPublic: false, isCommunity: true }
    return {
        isPublic: body.isPublic === false ? false : current.isPublic,
        isCommunity: body.isCommunity === false ? false : current.isCommunity,
    }
}

export async function hasCommunityAlbumAccess(
    album: { isCommunity: boolean },
    authUserId: string | null,
): Promise<boolean> {
    if (!album.isCommunity || !authUserId) return false
    const user = await db.query.users.findFirst({
        where: eq(users.id, authUserId),
        columns: { id: true },
    })
    return !!user
}

type AlbumOwnershipRecord = {
    ownerId: string
}

type AlbumUserRecord = {
    id: string
    email: string | null
}

type SerializableAlbum = {
    title: string
    createdAt: bigint | number
    updatedAt: bigint | number
    eventDate: bigint | number | null
}

type SerializableUser = {
    id: string
    avatarPath?: string | null
}

export function normalizeTags(value: unknown): string[] {
    if (!Array.isArray(value)) return []

    const normalized = value
        .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(tag => tag.length > 0)

    return Array.from(new Set(normalized))
}

export function assertAlbumOwnerWithEmail(
    album: AlbumOwnershipRecord,
    user: AlbumUserRecord,
    action: 'edit' | 'delete',
): void {
    if (album.ownerId !== user.id) {
        throw createError({ statusCode: 403, statusMessage: `Only the album owner can ${action} this album` })
    }

    if (!user.email) {
        throw createError({
            statusCode: 403,
            statusMessage: `Guest users cannot ${action} albums until they have an email assigned`,
        })
    }
}

export function avatarUrl(user: SerializableUser): string | null {
    return user.avatarPath ? `/api/assets/avatar/${user.id}` : null
}

export function serializeAlbum<TAlbum extends SerializableAlbum>(album: TAlbum) {
    return {
        ...album,
        name: album.title,
        createdAt: Number(album.createdAt),
        updatedAt: Number(album.updatedAt),
        eventDate: album.eventDate ? Number(album.eventDate) : null,
    }
}

