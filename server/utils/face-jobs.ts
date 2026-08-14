import { registerJobHandler, type JobRecord } from './queue'
import { detectFaces, type DetectedFace } from './machine-learning'
import { readStorageFile } from './storage'
import { faces, people, photos } from '../db/schema'
import { db } from './db'
import { and, eq, isNull } from 'drizzle-orm'

interface FaceDetectionJobPayload {
    photoId: string
    storagePath: string
}

const CENTROID_CACHE_TTL_MS = 60_000

// Centroids are derived from face embeddings and cached in memory instead of a
// centroid column; this keeps the schema simple and is fine at self-hosted scale.
let centroidCache: { loadedAt: number; centroids: Map<string, number[]> } | null = null

export function invalidatePersonCentroidCache(): void {
    centroidCache = null
}

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0

    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i]! * b[i]!
        normA += a[i]! * a[i]!
        normB += b[i]! * b[i]!
    }

    if (normA === 0 || normB === 0) return 0
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function loadPersonCentroids(): Promise<Map<string, number[]>> {
    if (centroidCache && Date.now() - centroidCache.loadedAt < CENTROID_CACHE_TTL_MS) {
        return centroidCache.centroids
    }

    const faceRows = await db.query.faces.findMany({
        columns: { personId: true, embedding: true },
        where: (facesColumns, { isNotNull }) => isNotNull(facesColumns.personId),
    })

    const sums = new Map<string, { sum: number[]; count: number }>()
    for (const row of faceRows) {
        if (!row.personId) continue
        const current = sums.get(row.personId) ?? { sum: [], count: 0 }
        row.embedding.forEach((value, index) => {
            current.sum[index] = (current.sum[index] ?? 0) + value
        })
        current.count += 1
        sums.set(row.personId, current)
    }

    const centroids = new Map<string, number[]>()
    for (const [personId, { sum, count }] of sums) {
        centroids.set(personId, sum.map(value => value / count))
    }

    centroidCache = { loadedAt: Date.now(), centroids }
    return centroids
}

export async function assignPerson(embedding: number[]): Promise<string> {
    const centroids = await loadPersonCentroids()
    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.5')

    let bestPersonId: string | null = null
    let bestSimilarity = -1
    for (const [personId, centroid] of centroids) {
        const similarity = cosineSimilarity(embedding, centroid)
        if (similarity > bestSimilarity) {
            bestSimilarity = similarity
            bestPersonId = personId
        }
    }

    if (bestPersonId && bestSimilarity >= threshold) return bestPersonId

    const now = BigInt(Math.floor(Date.now() / 1000))
    const [created] = await db.insert(people).values({
        createdAt: now,
        updatedAt: now,
    }).returning({ id: people.id })

    if (!created) throw new Error('Failed to create person')

    invalidatePersonCentroidCache()
    return created.id
}

export const clusteringInternals = {
    cosineSimilarity,
    assignPerson,
}

async function handleFaceDetectionJob(job: JobRecord): Promise<void> {
    if (process.env.FACE_DETECTION_ENABLED !== 'true') return

    const payload = job.payload as Partial<FaceDetectionJobPayload> | null
    if (!payload?.photoId || !payload?.storagePath) return
    const photoId = payload.photoId

    const photo = await db.query.photos.findFirst({
        columns: { id: true, storagePath: true },
        where: (photosColumns, { eq }) => eq(photosColumns.id, photoId),
    })
    if (!photo) return

    let buffer: Buffer
    try {
        buffer = await readStorageFile(photo.storagePath)
    } catch {
        // Photo file is gone; complete silently instead of failing the job.
        return
    }

    const detectedFaces = await detectFaces(buffer)

    await db.$client`DELETE FROM faces WHERE "photoId" = ${photo.id}`
    if (detectedFaces.length === 0) return

    const now = BigInt(Math.floor(Date.now() / 1000))
    const faceRows: Array<typeof faces.$inferInsert> = []
    for (const face of detectedFaces) {
        const personId = await assignPerson(face.embedding)
        faceRows.push(toFaceRow(face, photo.id, personId, now))
    }

    const inserted = await db.insert(faces).values(faceRows).returning({
        id: faces.id,
        personId: faces.personId,
    })

    // Ensure every person has a representative face so the People UI can render
    // a thumbnail. New people are created without one and need this backfill.
    const firstFaceByPerson = new Map<string, string>()
    for (const row of inserted) {
        if (row.personId && !firstFaceByPerson.has(row.personId)) {
            firstFaceByPerson.set(row.personId, row.id)
        }
    }
    if (firstFaceByPerson.size > 0) {
        const now = BigInt(Math.floor(Date.now() / 1000))
        await db.transaction(async (tx) => {
            for (const [personId, faceId] of firstFaceByPerson) {
                await tx.update(people)
                    .set({ representativeFaceId: faceId, updatedAt: now })
                    .where(and(eq(people.id, personId), isNull(people.representativeFaceId)))
            }
        })
    }
}

function toFaceRow(
    face: DetectedFace,
    photoId: string,
    personId: string,
    createdAt: bigint,
): typeof faces.$inferInsert {
    return {
        photoId,
        personId,
        x1: face.boundingBox.x1,
        y1: face.boundingBox.y1,
        x2: face.boundingBox.x2,
        y2: face.boundingBox.y2,
        score: face.score,
        embedding: face.embedding,
        createdAt,
    }
}

export function registerFaceJobHandlers(): void {
    registerJobHandler('face-detection', handleFaceDetectionJob)
}
