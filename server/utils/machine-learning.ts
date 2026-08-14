export interface DetectedFace {
    boundingBox: {
        x1: number
        y1: number
        x2: number
        y2: number
    }
    score: number
    embedding: number[]
}

export class MachineLearningUnavailableError extends Error {
    readonly retryable = true

    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = 'MachineLearningUnavailableError'
    }
}

export class MachineLearningRequestError extends Error {
    readonly retryable = false

    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = 'MachineLearningRequestError'
    }
}

const HEALTH_TIMEOUT_MS = 5000
const UNAVAILABLE_LOG_INTERVAL_MS = 60_000

let lastUnavailableLogAt = 0

function getMachineLearningBaseUrl(): string {
    return (process.env.MACHINE_LEARNING_URL || 'http://localhost:3003').replace(/\/+$/, '')
}

function getTimeoutMs(): number {
    const configured = parseInt(process.env.MACHINE_LEARNING_TIMEOUT_MS || '30000', 10)
    return Number.isFinite(configured) && configured > 0 ? configured : 30000
}

function getFaceModelName(): string {
    return process.env.MACHINE_LEARNING_FACE_MODEL || 'buffalo_l'
}

function getFaceMinScore(): number | null {
    const configured = process.env.MACHINE_LEARNING_FACE_MIN_SCORE
    if (configured === undefined || configured.trim() === '') return null
    const value = parseFloat(configured)
    return Number.isFinite(value) ? value : 0.5
}

function getApiStyle(): 'predict' | 'legacy' {
    return process.env.MACHINE_LEARNING_API_STYLE === 'legacy' ? 'legacy' : 'predict'
}

function getBasicAuthHeaders(): Record<string, string> {
    const user = process.env.MACHINE_LEARNING_BASIC_AUTH_USER || ''
    const password = process.env.MACHINE_LEARNING_BASIC_AUTH_PASSWORD || ''
    if (!user || !password) return {}

    return {
        authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
    }
}

function logUnavailableOnce(error: unknown): void {
    const now = Date.now()
    if (now - lastUnavailableLogAt < UNAVAILABLE_LOG_INTERVAL_MS) return
    lastUnavailableLogAt = now
    console.error('[machine-learning] unavailable:', error instanceof Error ? error.message : String(error))
}

function buildPredictEntriesJson(): string {
    const descriptor: Record<string, unknown> = {
        'facial-recognition': {
            modelName: getFaceModelName(),
        },
    }
    const minScore = getFaceMinScore()
    if (minScore !== null) {
        const recognition = descriptor['facial-recognition'] as Record<string, unknown>
        recognition.options = { minScore }
    }
    return JSON.stringify(descriptor)
}

async function readErrorBody(response: Response): Promise<string> {
    try {
        return (await response.text()).slice(0, 500)
    } catch {
        return ''
    }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, {
            ...init,
            redirect: 'manual',
            signal: controller.signal,
        })
    } finally {
        clearTimeout(timer)
    }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
}

function parseFacesResponse(json: unknown): DetectedFace[] {
    if (!json || typeof json !== 'object') return []

    const container = (json as Record<string, unknown>)['facial-recognition']
    const rawFaces = Array.isArray(json)
        ? json
        : container && typeof container === 'object' && Array.isArray((container as Record<string, unknown>).faces)
            ? (container as Record<string, unknown>).faces as unknown[]
            : []

    const faces: DetectedFace[] = []
    for (const raw of rawFaces) {
        if (!raw || typeof raw !== 'object') continue
        const face = raw as Record<string, unknown>
        const box = (face.boundingBox ?? face.box) as Record<string, unknown> | undefined
        const embedding = face.embedding
        if (!box || !Array.isArray(embedding) || embedding.length === 0) continue

        faces.push({
            boundingBox: {
                x1: toFiniteNumber(box.x1 ?? box.left),
                y1: toFiniteNumber(box.y1 ?? box.top),
                x2: toFiniteNumber(box.x2 ?? box.right),
                y2: toFiniteNumber(box.y2 ?? box.bottom),
            },
            score: toFiniteNumber(face.score),
            embedding: embedding.map(value => toFiniteNumber(value)),
        })
    }

    return faces
}

export async function detectFaces(imageBuffer: Buffer): Promise<DetectedFace[]> {
    const baseUrl = getMachineLearningBaseUrl()
    const apiStyle = getApiStyle()

    const form = new FormData()
    if (apiStyle === 'legacy') {
        form.append('entries', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg')
        form.append('tasks', JSON.stringify({
            'facial-recognition': { modelName: getFaceModelName() },
        }))
    } else {
        form.append('entries', buildPredictEntriesJson())
        form.append('image', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg')
    }

    try {
        const endpoint = apiStyle === 'legacy' ? '/facial-recognition' : '/predict'
        const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                ...getBasicAuthHeaders(),
            },
            body: form,
        }, getTimeoutMs())

        if (!response.ok) {
            const errorBody = await readErrorBody(response)
            const detail = errorBody ? `: ${errorBody}` : ''
            if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
                throw new MachineLearningRequestError(
                    `Machine learning API returned ${response.status} ${response.statusText}${detail}`
                )
            }
            throw new MachineLearningUnavailableError(
                `Machine learning API returned ${response.status} ${response.statusText}${detail}`
            )
        }

        return parseFacesResponse(await response.json())
    } catch (error) {
        if (error instanceof MachineLearningRequestError) {
            throw error
        }
        if (error instanceof MachineLearningUnavailableError) {
            logUnavailableOnce(error)
            throw error
        }
        const unavailable = new MachineLearningUnavailableError('Failed to reach machine learning API', { cause: error })
        logUnavailableOnce(unavailable)
        throw unavailable
    }
}

export async function checkMachineLearningHealth(): Promise<{
    available: boolean
    latencyMs?: number
    error?: string
}> {
    const baseUrl = getMachineLearningBaseUrl()
    const started = Date.now()

    const isHealthy = async (path: string): Promise<boolean> => {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
            method: 'GET',
            headers: getBasicAuthHeaders(),
        }, HEALTH_TIMEOUT_MS)
        return response.ok
    }

    try {
        let ok = false
        try {
            ok = await isHealthy('/ping')
        } catch {
            ok = false
        }
        if (!ok) {
            try {
                ok = await isHealthy('/')
            } catch {
                ok = false
            }
        }

        return ok
            ? { available: true, latencyMs: Date.now() - started }
            : {
                available: false,
                latencyMs: Date.now() - started,
                error: 'Machine learning API did not respond with OK',
            }
    } catch (error: any) {
        return {
            available: false,
            latencyMs: Date.now() - started,
            error: error?.message ?? 'Unknown error',
        }
    }
}
