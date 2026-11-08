import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { getVisibleAlbumIds } from '../server/utils/people'
import { parsePagination } from '../server/utils/pagination'

vi.mock('../server/utils/auth', () => ({ requireAuth: vi.fn(async () => ({ id: 'reader' })) }))
vi.mock('../server/utils/people', () => ({ getVisibleAlbumIds: vi.fn(async () => ['visible-album']) }))

const person = { id: 'person', name: 'Alice', representativeFaceId: 'face', createdAt: 1n, updatedAt: 2n }
const face = { id: 'face', photoId: 'photo', albumId: 'visible-album', x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4, score: 0.99, createdAt: 3n }
const photo = {
    id: 'photo', filename: 'photo.jpg', originalName: 'Original.jpg', size: 1024, width: 600, height: 400,
    cameraModel: 'Camera', lens: 'Lens', focalLength: '50mm', iso: 100, aperture: '2.8', shutterSpeed: '1/100',
    blurhash: 'hash', dateTaken: 4n, createdAt: 5n, updatedAt: 6n,
}
const uploader = { id: 'uploader', name: 'Photographer', instagram: 'photographer', avatarPath: 'avatar.jpg' }
let query: Record<string, string>
let database: any
let list: (event: any) => Promise<any>
let detail: (event: any) => Promise<any>
let photoFaces: (event: any) => Promise<any>

function result(rows: any[]) {
    const builder: any = { then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) }
    for (const name of ['from', 'innerJoin', 'leftJoin', 'where', 'groupBy', 'orderBy', 'limit', 'offset']) {
        builder[name] = vi.fn(() => builder)
    }
    return builder
}

beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (handler: any) => handler)
    list = (await import('../server/api/v1/people/index.get')).default
    detail = (await import('../server/api/v1/people/[id].get')).default
    photoFaces = (await import('../server/api/v1/photos/[id]/faces.get')).default
})

beforeEach(() => {
    query = {}
    database = {
        select: vi.fn(),
        query: {
            people: { findFirst: vi.fn(async () => person) },
            photos: { findFirst: vi.fn(async () => ({ album: { ownerId: 'owner', isCommunity: true, collaborators: [] } })) },
        },
    }
    vi.mocked(getVisibleAlbumIds).mockResolvedValue(['visible-album'])
    vi.stubGlobal('db', database)
    vi.stubGlobal('getQuery', () => query)
    vi.stubGlobal('getRouterParam', () => person.id)
    vi.stubGlobal('createError', (details: any) => Object.assign(new Error(details.statusMessage), details))
})

describe('people pagination', () => {
    it('uses bounded integer pagination even for malformed input', () => {
        expect(parsePagination({})).toEqual({ page: 1, limit: 50, offset: 0 })
        expect(parsePagination({ page: '-10', limit: '1000' })).toEqual({ page: 1, limit: 100, offset: 0 })
        expect(parsePagination({ page: 'Infinity', limit: 'invalid' })).toEqual({ page: 1, limit: 50, offset: 0 })
        expect(parsePagination({ page: '2.9', limit: '12.8' })).toEqual({ page: 2, limit: 12, offset: 12 })
    })

    it('returns a bounded page with total people, stable ordering, and the data envelope', async () => {
        query = { page: '2', limit: '10', search: 'Ali' }
        const rows = result([{ ...person, faceCount: 6 }])
        const total = result([{ total: 25 }])
        database.select.mockReturnValueOnce(rows).mockReturnValueOnce(total)
        const response = await list({})
        expect(response).toMatchObject({
            success: true, data: [{ id: person.id, faceCount: 6, createdAt: 1, updatedAt: 2 }],
            pagination: { page: 2, limit: 10, total: 25, hasMore: true },
        })
        expect(rows.limit).toHaveBeenCalledWith(10)
        expect(rows.offset).toHaveBeenCalledWith(10)
        expect(rows.orderBy.mock.calls[0]).toHaveLength(2)
        const predicate = new PgDialect().sqlToQuery(rows.where.mock.calls[0][0])
        expect(predicate.params).toEqual(['visible-album', '%Ali%'])
        expect(total.where).toHaveBeenCalledWith(rows.where.mock.calls[0][0])
        const selection = new PgDialect().sqlToQuery(database.select.mock.calls[1][0].total)
        expect(selection.sql).toContain('count(distinct')
        expect(() => JSON.stringify(response)).not.toThrow()
    })

    it('returns empty pagination for a library with no visible albums', async () => {
        vi.mocked(getVisibleAlbumIds).mockResolvedValue([])
        expect(await list({})).toEqual({ success: true, data: [], pagination: { page: 1, limit: 50, total: 0, hasMore: false } })
        expect(database.select).not.toHaveBeenCalled()
    })

    it('paginates faces independently of the person face count', async () => {
        query = { page: '2', limit: '2' }
        const rows = result([{ ...face, photo, uploader }])
        database.select.mockReturnValueOnce(rows).mockReturnValueOnce(result([{ total: 3 }]))
        const response = await detail({})
        expect(response).toMatchObject({
            data: { person: { id: person.id, name: 'Alice', faceCount: 3 }, faces: [{
                ...face, createdAt: 3,
                photo: {
                    ...photo, dateTaken: 4, createdAt: 5, updatedAt: 6,
                    uploader: { name: 'Photographer', instagram: 'photographer', avatar: '/api/assets/avatar/uploader' },
                },
            }] },
            pagination: { page: 2, limit: 2, total: 3, hasMore: false },
        })
        expect(rows.limit).toHaveBeenCalledWith(2)
        expect(rows.offset).toHaveBeenCalledWith(2)
        expect(rows.orderBy.mock.calls[0]).toHaveLength(2)
        expect(rows.leftJoin).toHaveBeenCalledTimes(1)
        expect(Object.keys(database.select.mock.calls[0][0].photo)).not.toContain('storagePath')
        expect(Object.keys(database.select.mock.calls[0][0].uploader)).not.toContain('email')
        expect(new PgDialect().sqlToQuery(rows.where.mock.calls[0][0]).params).toEqual(['person', 'visible-album'])
        expect(() => JSON.stringify(response)).not.toThrow()
    })

    it('returns viewer metadata when the photo has no capture date or uploader', async () => {
        database.select.mockReturnValueOnce(result([{ ...face, photo: { ...photo, dateTaken: null }, uploader: null }]))
            .mockReturnValueOnce(result([{ total: 1 }]))
        const response = await detail({})
        expect(response.data.faces[0].photo).toMatchObject({ dateTaken: null, uploader: null, createdAt: 5, updatedAt: 6 })
        expect(() => JSON.stringify(response)).not.toThrow()
    })

    it('returns an empty page rather than 404 past the last face', async () => {
        query = { page: '10' }
        database.select.mockReturnValueOnce(result([])).mockReturnValueOnce(result([{ total: 3 }]))
        expect(await detail({})).toMatchObject({ data: { faces: [], person: { faceCount: 3 } }, pagination: { hasMore: false } })
    })

    it('hides people without any visible faces', async () => {
        database.select.mockReturnValueOnce(result([])).mockReturnValueOnce(result([{ total: 0 }]))
        await expect(detail({})).rejects.toMatchObject({ statusCode: 404 })
    })
})

describe('photo face overlays', () => {
    it('returns normalized boxes and person names in the shared data envelope', async () => {
        database.select.mockReturnValue(result([{ ...face, personId: person.id, personName: person.name }]))
        expect(await photoFaces({})).toMatchObject({ success: true, data: [{ x1: 0.1, x2: 0.3, personId: 'person', personName: 'Alice', createdAt: 3 }] })
    })

    it('does not expose faces from an inaccessible private album', async () => {
        database.query.photos.findFirst.mockResolvedValue({ album: { ownerId: 'owner', isPublic: false, isCommunity: false, collaborators: [] } })
        await expect(photoFaces({})).rejects.toMatchObject({ statusCode: 403 })
        expect(database.select).not.toHaveBeenCalled()
    })
})
