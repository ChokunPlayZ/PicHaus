import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { createAccessToken, getAuthUserId } from '../server/utils/auth'
import { hasCommunityAlbumAccess, resolveAlbumVisibility } from '../server/utils/albums'

const user = { id: 'reader', email: 'reader@example.test', role: 'USER' }
const owner = { id: 'owner', name: 'Owner', email: 'owner@example.test' }
const createError = (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details)

let album: any
let dbMock: any
let headers: Record<string, string>
let requestPath: string
let query: Record<string, string>
let body: any
let handlers: Record<string, (event: any) => Promise<any>>

// A thenable query builder lets the real handlers run their access checks and
// serialization while the tests supply only the rows a database would return.
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
        list: (await import('../server/api/v1/album/index.get')).default,
        detail: (await import('../server/api/v1/album/[id].get')).default,
        create: (await import('../server/api/v1/album/create.post')).default,
        edit: (await import('../server/api/v1/album/[id].patch')).default,
        batch: (await import('../server/api/v1/album/batch/index.patch')).default,
        download: (await import('../server/api/v1/album/[id]/download-info.get')).default,
        publicAlbum: (await import('../server/api/pub/album/[id].get')).default,
        publicPhotos: (await import('../server/api/pub/album/[id]/photos.get')).default,
        full: (await import('../server/api/assets/full/[id].get')).default,
        thumb: (await import('../server/api/assets/thumb/[id].get')).default,
        upload: (await import('../server/api/v1/album/[id]/upload.post')).default,
        shareLinks: (await import('../server/api/v1/album/[id]/share-links.get')).default,
        photoEdit: (await import('../server/api/v1/photo/[id].patch')).default,
    }
})

beforeEach(async () => {
    album = {
        id: 'album', title: 'Community event', ownerId: owner.id, owner,
        isPublic: false, isCommunity: true, tags: [],
        createdAt: 1n, updatedAt: 1n, eventDate: null,
        coverPhotoId: 'cover', coverPhoto: { id: 'cover', blurhash: '' },
        collaborators: [{ userId: 'collaborator', role: 'viewer', createdAt: 1n,
            user: { id: 'collaborator', name: 'Collaborator', email: 'collaborator@example.test' } }],
    }
    const photo = { id: 'photo', album, uploaderId: owner.id, storagePath: 'photos/test.jpg', thumbnailStoragePath: 'thumbs/test.webp' }
    dbMock = {
        query: {
            users: { findFirst: vi.fn(async () => user) },
            albums: { findFirst: vi.fn(async () => album), findMany: vi.fn(async () => [album]) },
            photos: { findFirst: vi.fn(async () => photo) },
            albumCollaborators: { findFirst: vi.fn(async () => undefined) },
            shareLinks: { findFirst: vi.fn(async () => undefined) },
        },
        select: vi.fn(() => selectResult([])),
        update: vi.fn(), insert: vi.fn(),
    }
    headers = { Authorization: `Bearer ${await createAccessToken(user.id)}` }
    requestPath = '/api/v1/album/album'
    query = {}
    body = {}
    vi.stubGlobal('db', dbMock)
    vi.stubGlobal('createError', createError)
    vi.stubGlobal('getRequestHeader', (_event: any, name: string) => headers[name])
    vi.stubGlobal('getRequestURL', () => new URL(requestPath, 'http://localhost'))
    vi.stubGlobal('getQuery', () => query)
    vi.stubGlobal('getRouterParam', () => album.id)
    vi.stubGlobal('getCookie', () => undefined)
    vi.stubGlobal('parseCookies', () => ({}))
    vi.stubGlobal('readBody', async () => body)
    vi.stubGlobal('sendRedirect', vi.fn(() => 'redirect'))
    vi.stubGlobal('setHeader', vi.fn())
})

afterEach(() => vi.restoreAllMocks())

describe('album visibility changes', () => {
    it.each(['private', 'community', 'public'])('switches to %s from any previous mode', (visibility) => {
        for (const current of [{ isPublic: true, isCommunity: false }, { isPublic: false, isCommunity: true }, { isPublic: false, isCommunity: false }]) {
            expect(resolveAlbumVisibility({ visibility }, current)).toEqual({
                isPublic: visibility === 'public', isCommunity: visibility === 'community',
            })
        }
    })

    it('preserves visibility during metadata edits and supports legacy boolean clients', () => {
        expect(resolveAlbumVisibility({}, album)).toEqual({ isPublic: false, isCommunity: true })
        expect(resolveAlbumVisibility({ isPublic: true }, album)).toEqual({ isPublic: true, isCommunity: false })
        expect(resolveAlbumVisibility({ isCommunity: true }, { isPublic: true, isCommunity: false }))
            .toEqual({ isPublic: false, isCommunity: true })
        expect(resolveAlbumVisibility({ isCommunity: false }, album)).toEqual({ isPublic: false, isCommunity: false })
    })

    it.each([{ visibility: 'everyone' }, { visibility: null }, { isCommunity: 'true' }, { isPublic: 1 }, { isPublic: true, isCommunity: true }])('rejects invalid visibility %j', (input) => {
        expect(() => resolveAlbumVisibility(input)).toThrow()
    })

    it('creates a community album using the selected mode', async () => {
        body = { name: 'Community event', visibility: 'community' }
        const values = vi.fn(() => ({ returning: async () => [album] }))
        dbMock.insert.mockReturnValue({ values })
        const response = await handlers.create!({})
        expect(values).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false, isCommunity: true, ownerId: user.id }))
        expect(response.data.isCommunity).toBe(true)
    })

    it('allows only the owner to change community visibility', async () => {
        body = { visibility: 'private' }
        await expect(handlers.edit!({})).rejects.toMatchObject({ statusCode: 403 })
        expect(dbMock.update).not.toHaveBeenCalled()

        dbMock.query.users.findFirst.mockResolvedValue(owner)
        const set = vi.fn(() => ({ where: () => ({ returning: async () => [{ ...album, isCommunity: false }] }) }))
        dbMock.update.mockReturnValue({ set })
        await handlers.edit!({})
        expect(set).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false, isCommunity: false }))
    })

    it('supports community batch edits while keeping owner checks', async () => {
        body = { albumIds: [album.id], visibilityAction: 'community' }
        await expect(handlers.batch!({})).rejects.toMatchObject({ statusCode: 403 })
        dbMock.query.users.findFirst.mockResolvedValue(owner)
        const set = vi.fn(() => ({ where: async () => [] }))
        dbMock.update.mockReturnValue({ set })
        dbMock.transaction = async (callback: any) => callback(dbMock)
        await handlers.batch!({})
        expect(set).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false, isCommunity: true }))
    })
})

describe('community album access', () => {
    it('includes community albums in discovery alongside owned and collaborated albums', async () => {
        const builder = selectResult([{ ...album, photoCount: 0, collaboratorCount: 0 }])
        dbMock.select.mockReturnValueOnce(selectResult([])).mockReturnValueOnce(builder)
        const response = await handlers.list!({})
        expect(response.data[0]).toMatchObject({ id: album.id, isCommunity: true, isPublic: false })
        const predicate = new PgDialect().sqlToQuery(builder.where.mock.calls[0][0])
        expect(predicate.sql).toContain('"albums"."isCommunity" = $1')
        expect(predicate.params[0]).toBe(true)
    })

    it('requires a valid account for album discovery', async () => {
        headers = {}
        await expect(handlers.list!({})).rejects.toMatchObject({ statusCode: 401 })
    })

    it('lets an unrelated user view while hiding emails and retaining read-only permissions', async () => {
        const response = await handlers.detail!({})
        expect(response.data.isCommunity).toBe(true)
        expect(response.data.owner.email).toBeUndefined()
        expect(response.data.collaborators[0].user.email).toBeUndefined()
        expect(response.data.permissions).toEqual({ isOwner: false, isCollaborator: false, canEdit: false, canDelete: false, canUpload: false })
    })

    it('allows downloads for an unrelated signed-in user', async () => {
        await expect(handlers.download!({})).resolves.toMatchObject({ success: true })
    })

    it.each(['detail', 'download', 'full', 'thumb', 'publicAlbum', 'publicPhotos'])('denies anonymous access through %s', async (route) => {
        headers = {}
        await expect(handlers[route]!({})).rejects.toMatchObject({ statusCode: 403 })
    })

    it.each(['detail', 'download', 'full', 'thumb'])('revokes unrelated-user access through %s after switching to private', async (route) => {
        album.isCommunity = false
        await expect(handlers[route]!({})).rejects.toMatchObject({ statusCode: 403 })
    })

    it.each(['full', 'thumb'])('allows authenticated community photo access through %s', async (route) => {
        // Authorization runs before storage; the deliberately missing fixture
        // produces a storage 404 (or thumbnail fallback) after access succeeds.
        if (route === 'full') await expect(handlers[route]!({})).rejects.toMatchObject({ statusCode: 404 })
        else await expect(handlers[route]!({})).resolves.toBe('redirect')
        expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'Cache-Control', 'private, no-store')
    })

    it('preserves the session token when a community thumbnail falls back to the original', async () => {
        requestPath = '/api/assets/thumb/photo'
        query = { access_token: headers.Authorization!.slice(7) }
        headers = {}
        await handlers.thumb!({})
        expect(sendRedirect).toHaveBeenCalledWith(expect.anything(), `/api/assets/full/${album.id}?access_token=${encodeURIComponent(query.access_token!)}`)
    })

    it.each(['upload', 'shareLinks', 'photoEdit'])('does not grant mutation or management access through %s', async (route) => {
        await expect(handlers[route]!({})).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects community access from a deleted account', async () => {
        dbMock.query.users.findFirst.mockResolvedValue(undefined)
        await expect(hasCommunityAlbumAccess(album, user.id)).resolves.toBe(false)
        await expect(handlers.detail!({})).rejects.toMatchObject({ statusCode: 403 })
    })

    it('preserves anonymous public album access', async () => {
        headers = {}
        album.isCommunity = false
        album.isPublic = true
        await expect(handlers.detail!({})).resolves.toMatchObject({ success: true })
        await expect(handlers.download!({})).resolves.toMatchObject({ success: true })
        await expect(handlers.publicAlbum!({})).resolves.toMatchObject({ success: true })
    })

    it('accepts image query tokens for face thumbnails without authenticating other API routes', () => {
        query = { access_token: headers.Authorization!.slice(7) }
        headers = {}
        requestPath = '/api/v1/faces/face-id/thumb'
        expect(getAuthUserId({})).toBe(user.id)
        requestPath = '/api/v1/album/album'
        expect(getAuthUserId({})).toBeNull()
    })
})
