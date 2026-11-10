import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createUploadQueue, type ChunkResult } from '../app/utils/upload-queue'
import { flushComponent, mountVueFile, nodes, text } from './helpers/vue-component'

const photoId = '00000000-0000-4000-8000-000000000001'
const file = (name = 'photo.jpg', size = 12, type = 'image/jpeg') => new File([new Uint8Array(size)], name, { type })
async function flush() {
    for (let i = 0; i < 30; i++) await Promise.resolve()
    await flushComponent()
}

function setupQueue() {
    const statuses = new Map<string, string | null>([[photoId, 'pending']])
    const request = vi.fn(async (url: string, options?: any): Promise<any> => {
        if (url.endsWith('check-duplicates')) return { duplicates: [] }
        if (url.endsWith('initiate')) return { uploadId: 'session', nextOffset: 0 }
        if (url.endsWith('processing')) return {
            data: options.params.ids.split(',').filter((id: string) => statuses.has(id))
                .map((id: string) => ({ id, processingStatus: statuses.get(id) })),
        }
        throw new Error(`Unexpected request: ${url}`)
    })
    const uploadChunk = vi.fn(async (url: string, chunk: Blob, onProgress: (loaded: number) => void): Promise<ChunkResult> => {
        onProgress(chunk.size)
        const nextOffset = Number(new URL(url, 'http://localhost').searchParams.get('offset')) + chunk.size
        return { nextOffset, completed: true, photoId }
    })
    const calculateHash = vi.fn(async () => 'hash')
    const controller = createUploadQueue({ request, uploadChunk, calculateHash })
    return { controller, request, uploadChunk, calculateHash, statuses }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
})

describe('background upload queue', () => {
    it('keeps a transferred image processing and below 100% until thumbnail processing completes', async () => {
        const { controller, statuses } = setupQueue()
        controller.addFiles('album-a', 'Event', [file()])
        await flush()
        expect(controller.queue.value[0]).toMatchObject({ status: 'processing', photoId, progress: 100 })
        expect(controller.progress.value).toMatchObject({ percentage: 95, completed: 0, processing: 1 })
        expect(controller.active.value).toBe(true)
        expect(controller.completedVersions.value['album-a']).toBeUndefined()

        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]?.status).toBe('processing')
        statuses.set(photoId, 'processing')
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]?.status).toBe('processing')
        statuses.set(photoId, 'completed')
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]?.status).toBe('completed')
        expect(controller.progress.value).toMatchObject({ completed: 1, processing: 0, percentage: 100 })
        expect(controller.completedVersions.value['album-a']).toBe(1)
        expect(controller.active.value).toBe(false)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('tracks albums independently even while browsing away from the source album', async () => {
        const { controller, request } = setupQueue()
        controller.addFiles('album-a', 'First event', [file()])
        controller.addFiles('album-b', 'Second event', [file('other.jpg')])
        await flush()
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value.map(item => item.albumId)).toEqual(['album-a', 'album-b'])
        expect(request.mock.calls.some(([url]) => url === '/api/v1/album/album-a/processing')).toBe(true)
        expect(request.mock.calls.some(([url]) => url === '/api/v1/album/album-b/processing')).toBe(true)
    })

    it('limits concurrent transfers, but processing images do not occupy upload slots', async () => {
        const { controller, uploadChunk } = setupQueue()
        const finish: Array<(result: ChunkResult) => void> = []
        uploadChunk.mockImplementation(() => new Promise(resolve => finish.push(resolve)))
        controller.maxConcurrency.value = 2
        controller.addFiles('album', 'Event', [file('1.jpg'), file('2.jpg'), file('3.jpg'), file('4.jpg')])
        await flush()
        expect(uploadChunk).toHaveBeenCalledTimes(2)
        expect(controller.queue.value.filter(item => item.status === 'uploading')).toHaveLength(2)
        finish[0]!({ nextOffset: 12, completed: true, photoId })
        await flush()
        expect(uploadChunk).toHaveBeenCalledTimes(3)
        expect(controller.queue.value.filter(item => item.status === 'processing')).toHaveLength(1)
        expect(controller.queue.value.filter(item => item.status === 'uploading')).toHaveLength(2)
    })

    it('does not let one inaccessible album block processing updates for another', async () => {
        const { controller, request, statuses } = setupQueue()
        controller.addFiles('album-a', 'First event', [file()])
        controller.addFiles('album-b', 'Second event', [file('other.jpg')])
        await flush()
        statuses.set(photoId, 'completed')
        request.mockRejectedValueOnce({ statusCode: 403 })
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]?.status).toBe('failed')
        expect(controller.queue.value[1]?.status).toBe('completed')
        expect(controller.completedVersions.value['album-b']).toBe(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('retains resumable chunking and hashes each file only once', async () => {
        const { controller, uploadChunk, calculateHash } = setupQueue()
        controller.addFiles('album', 'Event', [file('large.jpg', 2 * 1024 * 1024 + 3)])
        await flush()
        expect(uploadChunk).toHaveBeenCalledTimes(2)
        expect(uploadChunk.mock.calls[1]?.[0]).toContain('offset=2097152')
        expect(calculateHash).toHaveBeenCalledTimes(1)
        expect(controller.queue.value[0]?.status).toBe('processing')
    })

    it('retries a temporary polling failure without declaring the image failed', async () => {
        const { controller, request, statuses } = setupQueue()
        controller.addFiles('album', 'Event', [file()])
        await flush()
        request.mockRejectedValueOnce(new Error('offline'))
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]?.status).toBe('processing')
        statuses.set(photoId, 'completed')
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]?.status).toBe('completed')
    })

    it.each(['failed', 'missing'])('reports %s processing as an error rather than success', async (status) => {
        const { controller, statuses } = setupQueue()
        controller.addFiles('album', 'Event', [file()])
        await flush()
        if (status === 'missing') statuses.delete(photoId)
        else statuses.set(photoId, status)
        await vi.advanceTimersByTimeAsync(2000)
        expect(controller.queue.value[0]).toMatchObject({ status: 'failed', error: 'Image processing failed.' })
        expect(controller.completedVersions.value.album).toBeUndefined()
        expect(controller.retryable.value).toBe(status === 'missing')
        expect(vi.getTimerCount()).toBe(0)
    })

    it('retries failed transfers and skips verified duplicates', async () => {
        const { controller, uploadChunk, request } = setupQueue()
        uploadChunk.mockRejectedValueOnce(new Error('offline'))
        controller.addFiles('album', 'Event', [file()])
        await flush()
        expect(controller.queue.value[0]?.status).toBe('failed')
        controller.retryFailed()
        await flush()
        expect(controller.queue.value[0]?.status).toBe('processing')

        request.mockResolvedValueOnce({ duplicates: ['hash'] })
        controller.addFiles('album', 'Event', [file('duplicate.jpg')])
        await flush()
        expect(controller.queue.value[1]?.status).toBe('skipped')
        expect(uploadChunk).toHaveBeenCalledTimes(2)
    })

    it('rejects videos, including files disguised with an image MIME type', async () => {
        const { controller, uploadChunk } = setupQueue()
        expect(controller.addFiles('album', 'Event', [file('video.mp4', 12, 'image/jpeg')])).toBe(1)
        await flush()
        expect(controller.queue.value[0]?.status).toBe('failed')
        expect(controller.retryable.value).toBe(false)
        expect(uploadChunk).not.toHaveBeenCalled()
    })

    it('does not clear processing items or dismiss active work', async () => {
        const { controller, statuses } = setupQueue()
        controller.addFiles('album', 'Event', [file()])
        await flush()
        controller.clearCompleted()
        controller.dismiss()
        expect(controller.queue.value).toHaveLength(1)
        expect(controller.visible.value).toBe(true)
        expect(controller.collapsed.value).toBe(true)
        statuses.set(photoId, 'completed')
        await vi.advanceTimersByTimeAsync(2000)
        controller.clearCompleted()
        expect(controller.queue.value).toHaveLength(0)
        expect(controller.visible.value).toBe(false)
    })
})

describe('floating upload progress panel', () => {
    it('is non-modal, bottom-left, and can be minimized without interrupting processing', async () => {
        const { controller } = setupQueue()
        controller.addFiles('album', 'Event', [file()])
        await flush()
        const { root, app } = mountVueFile('app/components/UploadProgressPanel.vue', { useUploadQueue: () => controller })
        expect(text(root)).toContain('Processing images…')
        expect(text(root)).toContain('1 processing')
        const panel = nodes(root).find(node => node.tag === 'section')!
        expect(panel.props.class).toContain('fixed left-3 bottom-3')
        expect(panel.props.role).toBe('region')
        expect(panel.props['aria-modal']).toBeUndefined()
        expect(nodes(root).find(node => node.props.role === 'progressbar')?.props['aria-valuenow']).toBe(95)
        nodes(root).find(node => node.props['aria-label'] === 'Minimize upload progress')!.props.onClick()
        await flush()
        expect(text(root)).not.toContain('photo.jpg')
        expect(text(root)).toContain('1 processing')
        expect(controller.active.value).toBe(true)
        app.unmount()
    })

    it('continues processing independently of the panel and renders the result after remounting', async () => {
        const { controller, statuses } = setupQueue()
        controller.addFiles('album', 'Event', [file()])
        await flush()
        const first = mountVueFile('app/components/UploadProgressPanel.vue', { useUploadQueue: () => controller })
        first.app.unmount()
        statuses.set(photoId, 'completed')
        await vi.advanceTimersByTimeAsync(2000)
        const second = mountVueFile('app/components/UploadProgressPanel.vue', { useUploadQueue: () => controller })
        expect(text(second.root)).toContain('Uploads complete')
        expect(nodes(second.root).find(node => node.props.role === 'progressbar')?.props['aria-valuenow']).toBe(100)
        second.app.unmount()
    })
})
