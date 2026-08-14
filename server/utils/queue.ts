import { randomUUID } from 'crypto'
import { count, sql } from 'drizzle-orm'
import { jobs } from '../db/schema'
import { db } from './db'
import { getUnixTimestamp } from './auth'

export type JobType = 'metadata' | 'thumbnail' | 'face-detection'

export interface JobRecord {
    id: string
    type: string
    payload: any
    attempts: number
    maxAttempts: number
}

const JOB_TYPES: JobType[] = ['metadata', 'thumbnail', 'face-detection']

const DEFAULT_CONCURRENCY: Record<JobType, number> = {
    metadata: 2,
    thumbnail: 2,
    'face-detection': 1,
}

const CONCURRENCY_ENV: Record<JobType, string> = {
    metadata: 'QUEUE_CONCURRENCY_METADATA',
    thumbnail: 'QUEUE_CONCURRENCY_THUMBNAIL',
    'face-detection': 'QUEUE_CONCURRENCY_FACE_DETECTION',
}

const POLL_INTERVAL_MS = 1000
const STALE_LOCK_SECONDS = 600
const MAX_BACKOFF_SECONDS = 300

const instanceId = randomUUID()
const handlers = new Map<JobType, (job: JobRecord) => Promise<void>>()
const inFlight: Record<JobType, number> = { metadata: 0, thumbnail: 0, 'face-detection': 0 }
const claiming: Record<JobType, boolean> = { metadata: false, thumbnail: false, 'face-detection': false }

let intervalId: ReturnType<typeof setInterval> | null = null
let started = false
let stopping = false

function concurrencyFor(type: JobType): number {
    const configured = parseInt(process.env[CONCURRENCY_ENV[type]] || '', 10)
    if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_CONCURRENCY[type]
    return Math.floor(configured)
}

export async function enqueueJob(
    type: JobType,
    payload: Record<string, unknown>,
    opts?: { priority?: number; maxAttempts?: number; runAt?: number },
): Promise<string> {
    const now = getUnixTimestamp()
    const [row] = await db.insert(jobs).values({
        type,
        payload: payload as any,
        priority: opts?.priority ?? 0,
        maxAttempts: opts?.maxAttempts ?? 3,
        runAt: BigInt(opts?.runAt ?? Number(now)),
        createdAt: now,
        updatedAt: now,
    }).returning({ id: jobs.id })

    if (!row) throw new Error('Failed to create job')
    return row.id
}

export function registerJobHandler(type: JobType, handler: (job: JobRecord) => Promise<void>): void {
    handlers.set(type, handler)
}

async function recoverStaleLocks(): Promise<void> {
    const now = getUnixTimestamp()
    await db.execute(sql`
        UPDATE jobs
        SET status = 'pending',
            "lockedAt" = NULL,
            "lockedBy" = NULL,
            "updatedAt" = ${now}
        WHERE status = 'running'
          AND "lockedAt" IS NOT NULL
          AND "lockedAt" <= ${now - BigInt(STALE_LOCK_SECONDS)}
    `)
}

async function claimJobs(type: JobType, limit: number): Promise<JobRecord[]> {
    if (limit <= 0) return []

    const now = getUnixTimestamp()
    const rows = await db.transaction(async (tx) => {
        return tx.execute(sql`
            UPDATE jobs
            SET status = 'running',
                "lockedAt" = ${now},
                "lockedBy" = ${instanceId},
                "updatedAt" = ${now}
            WHERE id IN (
                SELECT id
                FROM jobs
                WHERE status = 'pending'
                  AND type = ${type}
                  AND "runAt" <= ${now}
                ORDER BY priority DESC, "createdAt" ASC
                LIMIT ${limit}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, type, payload, attempts, "maxAttempts"
        `)
    })

    return rows as unknown as JobRecord[]
}

async function markJobCompleted(jobId: string): Promise<void> {
    await db.execute(sql`
        UPDATE jobs
        SET status = 'completed',
            "lockedAt" = NULL,
            "lockedBy" = NULL,
            "updatedAt" = ${getUnixTimestamp()}
        WHERE id = ${jobId}
    `)
}

async function retryJob(jobId: string, attempts: number, runAt: bigint): Promise<void> {
    await db.execute(sql`
        UPDATE jobs
        SET status = 'pending',
            attempts = ${attempts},
            "runAt" = ${runAt},
            "lockedAt" = NULL,
            "lockedBy" = NULL,
            "updatedAt" = ${getUnixTimestamp()}
        WHERE id = ${jobId}
    `)
}

async function failJob(jobId: string, attempts: number, errorMessage: string): Promise<void> {
    await db.execute(sql`
        UPDATE jobs
        SET status = 'failed',
            attempts = ${attempts},
            error = ${errorMessage},
            "lockedAt" = NULL,
            "lockedBy" = NULL,
            "updatedAt" = ${getUnixTimestamp()}
        WHERE id = ${jobId}
    `)
}

async function processJob(job: JobRecord): Promise<void> {
    const type = job.type as JobType
    const handler = handlers.get(type)
    if (!handler) {
        await failJob(job.id, job.attempts + 1, 'No handler registered for job type')
        return
    }

    try {
        await handler(job)
        await markJobCompleted(job.id)
    } catch (error) {
        const attempts = job.attempts + 1
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (attempts < job.maxAttempts) {
            const backoffSeconds = Math.min(Math.pow(2, attempts) * 5, MAX_BACKOFF_SECONDS)
            await retryJob(job.id, attempts, getUnixTimestamp() + BigInt(Math.floor(backoffSeconds)))
            console.error(`[queue] Job ${type} ${job.id} failed on attempt ${attempts}, retrying in ${Math.floor(backoffSeconds)}s: ${errorMessage}`)
        } else {
            await failJob(job.id, attempts, errorMessage)
            console.error(`[queue] Job ${type} ${job.id} failed permanently: ${errorMessage}`)
        }
    }
}

async function processClaimedJobs(type: JobType, claimed: JobRecord[]): Promise<void> {
    inFlight[type] += claimed.length
    try {
        await Promise.allSettled(claimed.map(job => processJob(job)))
    } finally {
        inFlight[type] -= claimed.length
    }
}

async function pollOnce(): Promise<void> {
    if (stopping) return

    try {
        await recoverStaleLocks()
        await Promise.all(JOB_TYPES.map(async (type) => {
            if (!handlers.has(type) || claiming[type]) return
            claiming[type] = true
            try {
                const limit = Math.max(0, concurrencyFor(type) - inFlight[type])
                const claimed = await claimJobs(type, limit)
                if (claimed.length > 0) {
                    void processClaimedJobs(type, claimed)
                }
            } finally {
                claiming[type] = false
            }
        }))
    } catch (error) {
        console.error('[queue] Poll cycle failed:', error)
    }
}

export function startWorker(): void {
    if (started) return
    started = true
    stopping = false

    void pollOnce()
    intervalId = setInterval(() => { void pollOnce() }, POLL_INTERVAL_MS)
    console.log('[queue] Worker started')
}

export async function stopWorker(): Promise<void> {
    stopping = true
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
    }

    while (
        Object.values(inFlight).some(jobCount => jobCount > 0) ||
        Object.values(claiming).some(active => active)
    ) {
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

export async function getQueueStats(): Promise<{ byType: Record<string, { pending: number; running: number; failed: number; completed: number }> }> {
    const rows = await db.select({
        type: jobs.type,
        status: jobs.status,
        jobCount: count(),
    }).from(jobs).groupBy(jobs.type, jobs.status)

    const byType: Record<string, { pending: number; running: number; failed: number; completed: number }> = {}
    for (const row of rows) {
        const statusCounts = byType[row.type] ?? { pending: 0, running: 0, failed: 0, completed: 0 }
        if (row.status === 'pending' || row.status === 'running' || row.status === 'failed' || row.status === 'completed') {
            statusCounts[row.status] = row.jobCount
        }
        byType[row.type] = statusCounts
    }

    return { byType }
}
