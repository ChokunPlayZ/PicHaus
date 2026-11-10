import { createUploadQueue, type ChunkResult } from '~/utils/upload-queue'
import { calculateSHA256 } from '~/utils/hash'
import { getAuthToken } from '~/utils/auth-client'
import type { $Fetch } from 'ofetch'

const queues = new WeakMap<object, ReturnType<typeof createUploadQueue>>()

export function useUploadQueue() {
    const app = useNuxtApp()
    let queue = queues.get(app)
    if (!queue) {
        queue = createUploadQueue({
            calculateHash: calculateSHA256,
            request: $fetch as $Fetch,
            uploadChunk: (url, chunk, onProgress) => new Promise<ChunkResult>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded) }
                xhr.onload = () => {
                    let result
                    try { result = JSON.parse(xhr.responseText) } catch { /* handled below */ }
                    if (xhr.status >= 200 && xhr.status < 300 && result) resolve(result)
                    else reject({ data: result, message: xhr.statusText || 'Upload failed' })
                }
                xhr.onerror = () => reject(new Error('Network error'))
                xhr.onabort = () => reject(new Error('Upload interrupted'))
                xhr.open('POST', url)
                xhr.setRequestHeader('Content-Type', 'application/octet-stream')
                const token = getAuthToken()
                if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                xhr.send(chunk)
            }),
        })
        queues.set(app, queue)
    }
    return queue
}
