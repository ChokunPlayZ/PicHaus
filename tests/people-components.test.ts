import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushComponent, mountVueFile, nodes, text } from './helpers/vue-component'

const person = { id: 'person', name: 'Alice', faceCount: 75, representativeFaceId: 'face' }
const photo = { id: 'photo', filename: 'photo.jpg', originalName: 'photo.jpg', size: 100, width: 1200, height: 800, createdAt: 1, updatedAt: 2, uploader: null }
const album = { id: 'album', name: 'Summer Party', description: 'An afternoon with friends', eventDate: 1785542400 }
const face = { id: 'face', personId: 'person', personName: 'Alice', photoId: 'photo', albumId: 'album', album, photo, x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 }
const pagination = { page: 1, limit: 50, total: 75, hasMore: true }
const mounted: ReturnType<typeof mountVueFile>[] = []
let fetchMock: ReturnType<typeof vi.fn>
let navigateTo: ReturnType<typeof vi.fn>
let toast: ReturnType<typeof vi.fn>

function mount(path: string, props: Record<string, any> = {}, authToken: string | null = 'token') {
    const component = mountVueFile(path, {
        $fetch: fetchMock, navigateTo, authToken,
        useRoute: () => ({ params: { id: 'person' } }),
        useState: () => ref({ role: 'ADMIN' }),
        useDialog: () => ({ toast, confirm: vi.fn() }),
    }, props)
    mounted.push(component)
    return component
}
beforeEach(() => {
    fetchMock = vi.fn()
    navigateTo = vi.fn()
    toast = vi.fn()
    vi.stubGlobal('document', { body: { style: {} } })
    vi.stubGlobal('window', { innerWidth: 375, innerHeight: 800, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    vi.stubGlobal('navigator', { userAgent: '', platform: '', maxTouchPoints: 0 })
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => {
    mounted.splice(0).forEach(component => component.app.unmount())
    vi.unstubAllGlobals()
})

describe('People page API rendering', () => {
    it('shows entries from data and displays the full library count', async () => {
        fetchMock.mockResolvedValue({ success: true, data: [person], pagination })
        const { root } = mount('app/pages/people/index.vue')
        await flushComponent()
        expect(text(root)).toContain('Alice')
        expect(text(root)).toContain('75 people found')
        expect(nodes(root).find(el => el.props['aria-label'] === 'View Alice')).toBeDefined()
        expect(fetchMock).toHaveBeenCalledWith('/api/v1/people', expect.objectContaining({ query: { page: 1, limit: 50 } }))
    })

    it('unwraps the person and faces without mistaking loaded faces for the total', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        expect(text(root)).toContain('Alice')
        expect(text(root)).toContain('75 faces')
        const faceButton = nodes(root).find(el => el.props['aria-label'] === 'Open photo')
        expect(faceButton).toBeDefined()
        faceButton!.props.onClick()
        await flushComponent()
        expect(navigateTo).not.toHaveBeenCalled()
        expect(nodes(root).find(el => el.tag === 'photo-viewer')?.props).toMatchObject({ photo, 'album-id': 'album', album })
    })

    it('uses shared photo tiles in an aspect-ratio-aware grid while keeping the header face portrait', async () => {
        const portrait = { ...photo, id: 'portrait', width: 800, height: 1200 }
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face, { ...face, id: 'portrait-face', photoId: portrait.id, photo: portrait }] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        expect(nodes(root).find(el => el.tag === 'h2')?.text).toBe('Photos')
        const tiles = nodes(root).filter(el => el.tag === 'photo-tile')
        expect(tiles).toHaveLength(2)
        expect(tiles.map(tile => tile.props.photo)).toEqual([photo, portrait])
        for (const tile of tiles) {
            const { position, photo } = tile.props
            expect(position.width).toBeGreaterThan(0)
            expect(position.height).toBeGreaterThan(0)
            expect(position.width / position.height).toBeCloseTo(photo.width / photo.height)
            expect(parseFloat(tile.parent!.props.style.height)).toBeGreaterThanOrEqual(position.top + position.height)
        }
        expect(nodes(root).filter(el => el.tag === 'img' && el.props.src === '/api/v1/faces/face/thumb')).toHaveLength(1)
    })

    it('keeps the photo visible when the header face thumbnail fails', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        nodes(root).find(el => el.tag === 'img' && el.props.src === '/api/v1/faces/face/thumb')!.props.onError()
        await flushComponent()
        expect(nodes(root).find(el => el.tag === 'photo-tile')?.props.photo).toEqual(photo)
    })

    it('shows the original album name and links directly to the photo without opening the viewer', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        const link = nodes(root).find(el => el.props.href === '/album/album?photo=photo')!
        expect(text(link)).toContain('Summer Party')
        expect(text(link)).toContain('Go to original album')
        expect(link.props.title).toBe('Go to original album: Summer Party')
        const stopPropagation = vi.fn()
        link.props.onClick({ stopPropagation })
        link.props.onKeydown({ key: 'Enter', stopPropagation })
        expect(stopPropagation).toHaveBeenCalledTimes(2)
        expect(nodes(root).some(el => el.tag === 'photo-viewer')).toBe(false)
    })

    it.each(['Enter', ' '])('opens shared photo tiles with the keyboard (%s)', async (key) => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        const tile = nodes(root).find(el => el.tag === 'photo-tile')!
        expect(tile.props).toMatchObject({ role: 'button', tabindex: '0', 'aria-label': 'Open photo' })
        tile.props.onKeydown.forEach((handler: (event: any) => void) => handler({ key, preventDefault: vi.fn() }))
        await flushComponent()
        expect(nodes(root).find(el => el.tag === 'photo-viewer')?.props.photo).toEqual(photo)
        expect(navigateTo).not.toHaveBeenCalled()
    })

    it('navigates in page order across albums and closes back to the grid', async () => {
        const faces = [face, {
            ...face, id: 'face-2', photoId: 'photo-2', albumId: 'another-album',
            album: { ...album, id: 'another-album', name: 'Winter Party' },
            photo: { ...photo, id: 'photo-2', updatedAt: 3 },
        }, {
            ...face, id: 'face-3', photoId: 'photo-3', photo: { ...photo, id: 'photo-3', updatedAt: 4 },
        }]
        fetchMock.mockResolvedValue({ success: true, data: { person, faces }, pagination: { ...pagination, total: 3, hasMore: false } })
        const { root } = mount('app/pages/people/[id].vue')
        const viewer = () => nodes(root).find(el => el.tag === 'photo-viewer')!
        await flushComponent()
        nodes(root).filter(el => el.props['aria-label'] === 'Open photo')[1]!.props.onClick()
        await flushComponent()
        expect(viewer().props).toMatchObject({
            photo: faces[1]!.photo, 'album-id': 'another-album', album: faces[1]!.album, 'has-previous': true, 'has-next': true,
            'previous-photo-id': 'photo', 'next-photo-id': 'photo-3', 'previous-photo-timestamp': 2, 'next-photo-timestamp': 4,
        })
        viewer().props.onNext()
        await flushComponent()
        expect(viewer().props).toMatchObject({ photo: faces[2]!.photo, 'album-id': 'album', album, 'has-next': false })
        viewer().props.onNext()
        await flushComponent()
        expect(viewer().props.photo.id).toBe('photo-3')
        viewer().props.onPrevious()
        await flushComponent()
        viewer().props.onPrevious()
        await flushComponent()
        expect(viewer().props).toMatchObject({ photo, 'has-previous': false })
        viewer().props.onPrevious()
        await flushComponent()
        expect(viewer().props.photo.id).toBe('photo')
        viewer().props.onClose()
        await flushComponent()
        expect(viewer()).toBeUndefined()
        expect(nodes(root).filter(el => el.props['aria-label'] === 'Open photo')).toHaveLength(3)
        expect(navigateTo).not.toHaveBeenCalled()
    })

    it('opens photos without an album link', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [{ ...face, albumId: null }] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        expect(text(root)).not.toContain('Go to original album')
        nodes(root).find(el => el.props['aria-label'] === 'Open photo')!.props.onClick()
        await flushComponent()
        expect(nodes(root).find(el => el.tag === 'photo-viewer')?.props).toMatchObject({ photo, 'album-id': null })
        expect(navigateTo).not.toHaveBeenCalled()
    })

    it.each([false, true])('advances into the next page (already loading: %s)', async (alreadyLoading) => {
        let resolvePage!: (value: any) => void
        const nextFace = { ...face, id: 'face-2', photoId: 'photo-2', photo: { ...photo, id: 'photo-2' } }
        fetchMock.mockResolvedValueOnce({ success: true, data: { person, faces: [face] }, pagination })
            .mockImplementationOnce(() => new Promise(resolve => { resolvePage = resolve }))
        const { root } = mount('app/pages/people/[id].vue')
        const viewer = () => nodes(root).find(el => el.tag === 'photo-viewer')!
        await flushComponent()
        nodes(root).find(el => el.props['aria-label'] === 'Open photo')!.props.onClick()
        await flushComponent()
        if (alreadyLoading) nodes(root).find(el => el.props.onLoad)!.props.onLoad()
        viewer().props.onNext()
        viewer().props.onNext()
        await flushComponent()
        expect(viewer().props.photo.id).toBe('photo')
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/people/person', expect.objectContaining({ query: { page: 2, limit: 50 } }))
        resolvePage({ success: true, data: { person, faces: [nextFace] }, pagination: { ...pagination, page: 2, hasMore: false } })
        await flushComponent()
        expect(viewer().props).toMatchObject({ photo: nextFace.photo, 'has-previous': true, 'has-next': false })
        expect(navigateTo).not.toHaveBeenCalled()
    })

    it('keeps the viewer open on page errors and lets Next retry', async () => {
        const nextFace = { ...face, id: 'face-2', photoId: 'photo-2', photo: { ...photo, id: 'photo-2' } }
        fetchMock.mockResolvedValueOnce({ success: true, data: { person, faces: [face] }, pagination })
            .mockRejectedValueOnce(new Error('Offline'))
            .mockResolvedValueOnce({ success: true, data: { person, faces: [nextFace] }, pagination: { ...pagination, page: 2, hasMore: false } })
        const { root } = mount('app/pages/people/[id].vue')
        const viewer = () => nodes(root).find(el => el.tag === 'photo-viewer')!
        await flushComponent()
        nodes(root).find(el => el.props['aria-label'] === 'Open photo')!.props.onClick()
        await flushComponent()
        viewer().props.onNext()
        await flushComponent()
        expect(viewer().props.photo).toEqual(photo)
        expect(toast).toHaveBeenCalledWith('Failed to load person', 'error')
        viewer().props.onNext()
        await flushComponent()
        expect(viewer().props.photo).toEqual(nextFace.photo)
    })

    it('does not reopen the viewer if it is closed while the next page loads', async () => {
        let resolvePage!: (value: any) => void
        fetchMock.mockResolvedValueOnce({ success: true, data: { person, faces: [face] }, pagination })
            .mockImplementationOnce(() => new Promise(resolve => { resolvePage = resolve }))
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        nodes(root).find(el => el.props['aria-label'] === 'Open photo')!.props.onClick()
        await flushComponent()
        const viewer = nodes(root).find(el => el.tag === 'photo-viewer')!
        viewer.props.onNext()
        viewer.props.onClose()
        resolvePage({
            success: true, data: { person, faces: [{ ...face, id: 'face-2', photo: { ...photo, id: 'photo-2' } }] },
            pagination: { ...pagination, page: 2, hasMore: false },
        })
        await flushComponent()
        expect(nodes(root).some(el => el.tag === 'photo-viewer')).toBe(false)
    })
})

describe('photo viewer original album link', () => {
    it('links to the current photo in its original album from the info panel', async () => {
        fetchMock.mockResolvedValue({ success: true, data: [] })
        const component = mount('app/components/PhotoViewer.vue', { photo, albumId: 'album', album, hasPrevious: false, hasNext: false })
        await flushComponent()
        nodes(component.root).find(el => el.props['aria-label'] === 'Photo information')!.props.onClick()
        await flushComponent()
        expect(nodes(component.root).find(el => el.props.href === '/album/album?photo=photo')).toBeDefined()
        expect(text(component.root)).toContain('Go to original album')
        expect(text(component.root)).toContain('Summer Party')
        expect(text(component.root)).toContain('An afternoon with friends')
        expect(text(component.root)).toContain(new Date(album.eventDate * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))
        component.app._instance!.props.photo = { ...photo, id: 'photo-2' }
        component.app._instance!.props.albumId = 'another-album'
        await flushComponent()
        expect(nodes(component.root).find(el => el.props.href === '/album/another-album?photo=photo-2')).toBeDefined()
        expect(nodes(component.root).some(el => el.props.href === '/album/album?photo=photo')).toBe(false)
        expect(text(component.root)).not.toContain('Summer Party')
        component.app._instance!.props.album = { id: 'another-album', name: 'Winter Party', description: null, eventDate: null }
        await flushComponent()
        expect(text(component.root)).toContain('Winter Party')
        expect(text(component.root)).not.toContain('An afternoon with friends')
        expect(text(component.root)).not.toContain('Invalid Date')
    })

    it('keeps the original album link when album details are unavailable', async () => {
        fetchMock.mockResolvedValue({ success: true, data: [] })
        const { root } = mount('app/components/PhotoViewer.vue', { photo, albumId: 'album', hasPrevious: false, hasNext: false })
        await flushComponent()
        nodes(root).find(el => el.props['aria-label'] === 'Photo information')!.props.onClick()
        await flushComponent()
        expect(nodes(root).some(el => el.props.href === '/album/album?photo=photo')).toBe(true)
        expect(text(root)).toContain('Go to original album')
    })

    it('does not add album links to viewers without an album ID', async () => {
        const { root } = mount('app/components/PhotoViewer.vue', { photo, album, hasPrevious: false, hasNext: false }, null)
        await flushComponent()
        nodes(root).find(el => el.props['aria-label'] === 'Photo information')!.props.onClick()
        await flushComponent()
        expect(text(root)).not.toContain('Go to original album')
        expect(text(root)).not.toContain('Summer Party')
    })
})

describe('photo viewer face boxes', () => {
    const props = {
        photo: { id: 'photo', filename: 'photo.jpg', originalName: 'photo.jpg', size: 100, createdAt: 1, uploader: null },
        hasPrevious: false, hasNext: false,
    }

    it('offers desktop and mobile face toggles and draws normalized boxes when enabled', async () => {
        fetchMock.mockResolvedValue({ success: true, data: [face] })
        const { root } = mount('app/components/PhotoViewer.vue', props)
        await flushComponent()
        const toggles = nodes(root).filter(el => el.props['aria-label'] === 'Show faces')
        expect(toggles).toHaveLength(2)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        nodes(root).find(el => el.tag === 'img')!.props.onLoad()
        toggles[0]!.props.onClick({ stopPropagation() {} })
        await flushComponent()
        expect(nodes(root).some(el => el.props.style?.left === '10%' && el.props.style?.top === '20%')).toBe(true)
        const personLink = nodes(root).find(el => el.props['aria-label'] === 'Open Alice')
        expect(personLink).toBeDefined()
        personLink!.props.onClick({ stopPropagation() {} })
        expect(navigateTo).toHaveBeenCalledWith('/people/person')
    })

    it('does not request face data for anonymous viewers', async () => {
        const { root } = mount('app/components/PhotoViewer.vue', props, null)
        await flushComponent()
        expect(fetchMock).not.toHaveBeenCalled()
        expect(nodes(root).some(el => el.props['aria-label'] === 'Show faces')).toBe(false)
    })
})
