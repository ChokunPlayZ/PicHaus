import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { getAuthUserId, requireAuth } from '../server/utils/auth'
import { photoIsReady } from '../server/utils/photo-visibility'

vi.mock('../server/utils/auth', () => ({
    requireAuth: vi.fn(), getAuthUserId: vi.fn(), getUnixTimestamp: () => 1n,
}))

const photoId = '00000000-0000-4000-8000-000000000001'
let handlers: Record<string, (event: any) => Promise<any>>
let dbMock: any
let album: any
let query: Record<string, unknown>
let selections: any[]

function selectResult(rows: any[]) {
    const builder: any = { then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) }
    for (const method of ['from', 'leftJoin', 'innerJoin', 'where', 'orderBy', 'limit', 'offset', 'groupBy']) {
        builder[method] = vi.fn(() => builder)
    }
    return builder
}

beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (handler: any) => handler)
    handlers = {
        processing: (await import('../server/api/v1/album/[id]/processing.get')).default,
        detail: (await import('../server/api/v1/album/[id].get')).default,
        publicPhotos: (await import('../server/api/pub/album/[id]/photos.get')).default,
    }
})

beforeEach(() => {
    album = {
        id: 'album', ownerId: 'owner', title: 'Event', isPublic: true, isCommunity: false,
        collaborators: [], owner: { id: 'owner', name: 'Owner' },
        coverPhotoId: photoId, coverPhoto: { id: photoId, blurhash: '' },
        createdAt: 1n, updatedAt: 1n,
    }
    query = { ids: photoId }
    selections = []
    dbMock = {
        query: {
            albums: { findFirst: vi.fn(async () => album) },
            users: { findFirst: vi.fn(async () => ({ id: 'owner', email: 'owner@example.test' })) },
            albumCollaborators: { findFirst: vi.fn(async () => undefined) },
        },
        select: vi.fn(() => {
            const builder = selectResult([])
            selections.push(builder)
            return builder
        }),
        selectDistinctOn: vi.fn(() => selectResult([])),
    }
    vi.mocked(requireAuth).mockResolvedValue({ id: 'owner' } as any)
    vi.mocked(getAuthUserId).mockReturnValue('owner')
    vi.stubGlobal('db', dbMock)
    vi.stubGlobal('getRouterParam', () => 'album')
    vi.stubGlobal('getQuery', () => query)
    vi.stubGlobal('setHeader', vi.fn())
    vi.stubGlobal('createError', (details: any) => Object.assign(new Error(details.statusMessage), details))
})
afterEach(() => vi.clearAllMocks())

describe('photo visibility during processing', () => {
    it('includes completed and legacy photos, but not pending, processing, or failed images', () => {
        const predicate = new PgDialect().sqlToQuery(photoIsReady())
        expect(predicate.sql).toBe('("photos"."processingStatus" is null or "photos"."processingStatus" = $1)')
        expect(predicate.params).toEqual(['completed'])
    })

    it.each(['detail', 'publicPhotos'])('filters %s before pagination and counting', async (handler) => {
        await handlers[handler]!({})
        // The first two queries retrieve the page and its count; both need the same readiness filter.
        for (const builder of selections.slice(0, 2)) {
            const predicate = new PgDialect().sqlToQuery(builder.where.mock.calls[0][0])
            expect(predicate.sql).toContain('"photos"."processingStatus" is null')
            expect(predicate.params).toContain('completed')
        }
        expect(selections.length).toBeGreaterThanOrEqual(2)
    })
})

describe('upload processing status API', () => {
    it('returns only statuses scoped to the requested album and IDs, without caching', async () => {
        const builder = selectResult([{ id: photoId, processingStatus: 'processing' }])
        dbMock.select.mockReturnValueOnce(builder)
        const response = await handlers.processing!({})
        expect(response).toEqual({ success: true, data: [{ id: photoId, processingStatus: 'processing' }] })
        const predicate = new PgDialect().sqlToQuery(builder.where.mock.calls[0][0])
        expect(predicate.params).toEqual(['album', photoId])
        expect(predicate.sql).toContain('"photos"."albumId" = $1')
        expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'Cache-Control', 'private, no-store')
    })

    it('denies unrelated users even when the album is public', async () => {
        vi.mocked(requireAuth).mockResolvedValue({ id: 'reader' } as any)
        await expect(handlers.processing!({})).rejects.toMatchObject({ statusCode: 403 })
        expect(dbMock.select).not.toHaveBeenCalled()
        const access = new PgDialect().sqlToQuery(dbMock.query.albumCollaborators.findFirst.mock.calls[0][0].where)
        expect(access.params).toEqual(['album', 'reader', 'admin', 'editor'])
    })

    it('allows upload collaborators to monitor their queue', async () => {
        vi.mocked(requireAuth).mockResolvedValue({ id: 'photographer' } as any)
        dbMock.query.albumCollaborators.findFirst.mockResolvedValue({ role: 'editor' })
        await expect(handlers.processing!({})).resolves.toEqual({ success: true, data: [] })
    })

    it.each([
        { label: 'missing', ids: undefined },
        { label: 'empty', ids: '' },
        { label: 'malformed', ids: 'not-a-uuid' },
        { label: 'array', ids: [photoId] },
        { label: 'oversized', ids: Array(101).fill(photoId).join(',') },
    ])('rejects $label ID lists', async ({ ids }) => {
        query = { ids }
        await expect(handlers.processing!({})).rejects.toMatchObject({ statusCode: 400 })
        expect(dbMock.select).not.toHaveBeenCalled()
    })
})
