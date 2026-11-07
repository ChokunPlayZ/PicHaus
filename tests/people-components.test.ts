import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushComponent, mountVueFile, nodes, text } from './helpers/vue-component'

const person = { id: 'person', name: 'Alice', faceCount: 75, representativeFaceId: 'face' }
const face = { id: 'face', personId: 'person', personName: 'Alice', photoId: 'photo', albumId: 'album', x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 }
const pagination = { page: 1, limit: 50, total: 75, hasMore: true }
const mounted: ReturnType<typeof mountVueFile>[] = []
let fetchMock: ReturnType<typeof vi.fn>
let navigateTo: ReturnType<typeof vi.fn>

function mount(path: string, props: Record<string, any> = {}, authToken: string | null = 'token') {
    const component = mountVueFile(path, {
        $fetch: fetchMock, navigateTo, authToken,
        useRoute: () => ({ params: { id: 'person' } }),
        useState: () => ref({ role: 'ADMIN' }),
        useDialog: () => ({ toast: vi.fn(), confirm: vi.fn() }),
    }, props)
    mounted.push(component)
    return component
}
beforeEach(() => {
    fetchMock = vi.fn()
    navigateTo = vi.fn()
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
        const faceButton = nodes(root).find(el => el.props['aria-label'] === 'Open photo in album')
        expect(faceButton).toBeDefined()
        faceButton!.props.onClick()
        expect(navigateTo).toHaveBeenCalledWith('/album/album?photo=photo')
    })

    it('shows uncropped photo thumbnails while keeping the header face portrait', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        expect(nodes(root).find(el => el.tag === 'h2')?.text).toBe('Photos')
        const photo = nodes(root).find(el => el.tag === 'img' && el.props.src === '/api/assets/thumb/photo')
        expect(photo).toBeDefined()
        expect(photo!.props.class).toContain('object-contain')
        expect(photo!.props.class).not.toContain('object-cover')
        expect(photo!.props.class).not.toContain('scale-')
        expect(photo!.props.loading).toBe('lazy')
        expect(nodes(root).filter(el => el.tag === 'img' && el.props.src === '/api/v1/faces/face/thumb')).toHaveLength(1)
    })

    it('keeps the photo visible when the header face thumbnail fails', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        nodes(root).find(el => el.tag === 'img' && el.props.src === '/api/v1/faces/face/thumb')!.props.onError()
        await flushComponent()
        expect(nodes(root).some(el => el.tag === 'img' && el.props.src === '/api/assets/thumb/photo')).toBe(true)
    })

    it('keeps the header portrait and album link when a photo thumbnail fails', async () => {
        fetchMock.mockResolvedValue({ success: true, data: { person, faces: [face] }, pagination })
        const { root } = mount('app/pages/people/[id].vue')
        await flushComponent()
        nodes(root).find(el => el.tag === 'img' && el.props.src === '/api/assets/thumb/photo')!.props.onError()
        await flushComponent()
        expect(nodes(root).some(el => el.tag === 'img' && el.props.src === '/api/assets/thumb/photo')).toBe(false)
        expect(nodes(root).some(el => el.tag === 'img' && el.props.src === '/api/v1/faces/face/thumb')).toBe(true)
        nodes(root).find(el => el.props['aria-label'] === 'Open photo in album')!.props.onClick()
        expect(navigateTo).toHaveBeenCalledWith('/album/album?photo=photo')
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
