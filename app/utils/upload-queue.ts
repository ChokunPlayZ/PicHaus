import { computed, ref } from 'vue'

export interface UploadItem {
    id: string
    albumId: string
    albumName: string
    file: File
    status: 'hashing' | 'checking' | 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'skipped'
    progress: number
    hash?: string
    photoId?: string
    error?: string
}

export interface ChunkResult {
    nextOffset: number
    completed?: boolean
    photoId?: string
}

interface QueueDependencies {
    calculateHash: (file: File) => Promise<string>
    request: <T>(url: string, options?: { method?: 'POST'; body?: Record<string, unknown>; params?: Record<string, string> }) => Promise<T>
    uploadChunk: (url: string, chunk: Blob, onProgress: (loaded: number) => void) => Promise<ChunkResult>
}

const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm|avi|mkv|wmv|flv|mpeg|mpg|3gp|3g2)$/i
const IMAGE_FILE_RE = /\.(heic|heif|raw|arw|cr2|nef|orf|rw2|dng)$/i
const terminal = (item: UploadItem) => ['completed', 'skipped', 'failed'].includes(item.status)
const acceptedImage = (file: File) => !file.type.startsWith('video/') && !VIDEO_FILE_RE.test(file.name)
    && (file.type.startsWith('image/') || IMAGE_FILE_RE.test(file.name))
const canRetry = (item: UploadItem) => item.status === 'failed' && !item.photoId && acceptedImage(item.file)

// The controller belongs to the app, not the album page: navigation must not stop uploads.
export function createUploadQueue(deps: QueueDependencies) {
    const queue = ref<UploadItem[]>([])
    const maxConcurrency = ref(3)
    const visible = ref(false)
    const collapsed = ref(false)
    const completedVersions = ref<Record<string, number>>({})
    const active = computed(() => queue.value.some(item => !terminal(item)))
    const retryable = computed(() => queue.value.some(canRetry))
    const progress = computed(() => {
        const total = queue.value.length
        const completed = queue.value.filter(terminal).length
        const processing = queue.value.filter(item => item.status === 'processing').length
        const failed = queue.value.filter(item => item.status === 'failed').length
        const sum = queue.value.reduce((value, item) => value + (
            terminal(item) ? 100 : item.status === 'processing' ? 95 : item.progress * 0.9
        ), 0)
        return { total, completed, processing, failed, percentage: total ? Math.floor(sum / total) : 0 }
    })
    let hashing = false
    let nextId = 0
    let polling = false
    let pollTimer: ReturnType<typeof setTimeout> | undefined

    const complete = (item: UploadItem) => {
        item.status = 'completed'
        item.progress = 100
        completedVersions.value[item.albumId] = (completedVersions.value[item.albumId] || 0) + 1
    }

    const schedulePoll = () => {
        if (!pollTimer && !polling && queue.value.some(item => item.status === 'processing')) {
            pollTimer = setTimeout(() => {
                pollTimer = undefined
                void pollProcessing()
            }, 2000)
        }
    }

    const pollProcessing = async () => {
        if (polling) return
        polling = true
        const pending = queue.value.filter(item => item.status === 'processing' && item.photoId)
        try {
            for (const albumId of new Set(pending.map(item => item.albumId))) {
                const albumItems = pending.filter(item => item.albumId === albumId)
                for (let offset = 0; offset < albumItems.length; offset += 100) {
                    const items = albumItems.slice(offset, offset + 100)
                    try {
                        const response = await deps.request<{ data: Array<{ id: string; processingStatus: string | null }> }>(
                            `/api/v1/album/${albumId}/processing`,
                            { params: { ids: items.map(item => item.photoId).join(',') } },
                        )
                        const statuses = new Map(response.data.map(photo => [photo.id, photo.processingStatus]))
                        for (const item of items) {
                            const status = statuses.get(item.photoId!)
                            if (status === 'completed' || status === null) {
                                complete(item)
                            } else if (status === 'failed' || !statuses.has(item.photoId!)) {
                                item.status = 'failed'
                                item.error = 'Image processing failed.'
                                // Metadata failures remove the photo; those can safely be uploaded again.
                                if (!statuses.has(item.photoId!)) item.photoId = undefined
                            }
                        }
                    } catch (error: any) {
                        if ([401, 403, 404].includes(error?.statusCode ?? error?.status)) {
                            for (const item of items) {
                                item.status = 'failed'
                                item.error = 'Unable to check processing status. Album access is no longer available.'
                            }
                        }
                        // Transient failures are retried, and must not block progress in other albums.
                    }
                }
            }
        } finally {
            polling = false
            schedulePoll()
        }
    }

    const verify = async (item: UploadItem) => {
        hashing = true
        try {
            item.hash = await deps.calculateHash(item.file)
            item.status = 'checking'
            const { duplicates } = await deps.request<{ duplicates: string[] }>(`/api/v1/album/${item.albumId}/check-duplicates`, {
                method: 'POST', body: { hashes: [item.hash] },
            })
            item.status = duplicates.includes(item.hash) ? 'skipped' : 'pending'
            if (item.status === 'skipped') item.progress = 100
        } catch (error: any) {
            item.status = 'failed'
            item.error = error?.data?.statusMessage || error?.message || 'Verification failed'
        } finally {
            hashing = false
            pump()
        }
    }

    const upload = async (item: UploadItem) => {
        item.status = 'uploading'
        item.progress = 0
        try {
            const init = await deps.request<{ uploadId?: string; nextOffset?: number; duplicate?: boolean }>(
                `/api/v1/album/${item.albumId}/upload/resumable/initiate`,
                { method: 'POST', body: { filename: item.file.name, fileSize: item.file.size, fileHash: item.hash, mimeType: item.file.type || 'application/octet-stream' } },
            )
            if (init.duplicate) {
                item.status = 'skipped'
                item.progress = 100
                return
            }
            if (!init.uploadId) throw new Error('Unable to start upload')
            let offset = init.nextOffset ?? 0
            while (offset < item.file.size) {
                const currentOffset = offset
                const chunk = item.file.slice(offset, offset + 2 * 1024 * 1024)
                const result = await deps.uploadChunk(
                    `/api/v1/album/${item.albumId}/upload/resumable/chunk?uploadId=${init.uploadId}&offset=${offset}`,
                    chunk,
                    loaded => { item.progress = Math.min(100, Math.round((currentOffset + loaded) * 100 / item.file.size)) },
                )
                if (result.nextOffset <= offset || result.nextOffset > item.file.size) throw new Error('Invalid upload offset')
                offset = result.nextOffset
                if (result.photoId) item.photoId = result.photoId
            }
            if (!item.photoId) throw new Error('Upload did not return a photo ID')
            item.status = 'processing'
            item.progress = 100
            schedulePoll()
        } catch (error: any) {
            item.status = 'failed'
            item.error = error?.data?.statusMessage || error?.message || 'Upload failed'
        } finally {
            pump()
        }
    }

    function pump() {
        if (!hashing) {
            const item = queue.value.find(item => item.status === 'hashing')
            if (item) void verify(item)
        }
        const concurrency = Math.min(5, Math.max(1, Math.floor(Number(maxConcurrency.value) || 3)))
        let slots = concurrency - queue.value.filter(item => item.status === 'uploading').length
        for (const item of queue.value) {
            if (slots <= 0) break
            if (item.status === 'pending') {
                slots--
                void upload(item)
            }
        }
    }

    const addFiles = (albumId: string, albumName: string, files: File[]) => {
        let rejected = 0
        for (const file of files) {
            const accepted = acceptedImage(file)
            if (!accepted) rejected++
            queue.value.push({
                id: `${Date.now()}-${nextId++}`, albumId, albumName, file,
                status: accepted ? 'hashing' : 'failed', progress: 0,
                error: accepted ? undefined : 'Only image files can be uploaded. Videos are not supported.',
            })
        }
        visible.value = true
        collapsed.value = false
        pump()
        return rejected
    }

    const retryFailed = () => {
        for (const item of queue.value) {
            if (canRetry(item)) {
                item.status = 'hashing'
                item.error = undefined
                item.progress = 0
            }
        }
        pump()
    }
    const clearCompleted = () => {
        queue.value = queue.value.filter(item => !['completed', 'skipped'].includes(item.status))
        if (!queue.value.length) visible.value = false
    }
    const dismiss = () => {
        if (active.value) collapsed.value = true
        else visible.value = false
    }

    return { queue, maxConcurrency, visible, collapsed, active, progress, retryable, completedVersions, addFiles, retryFailed, clearCompleted, dismiss }
}
