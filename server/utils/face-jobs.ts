import { registerJobHandler, type JobRecord } from './queue'
import { detectFaces, type DetectedFace } from './machine-learning'
import { readStorageFile } from './storage'
import { faces, people, photos } from '../db/schema'
import { db } from './db'
import sharp from 'sharp'

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

/**
 * Normalize ML bounding boxes (pixels in the detection image) to 0..1 relative
 * to the original image. Normalized coordinates are scale-invariant: the
 * correct conversion is `pixel / detectionDimension`.
 */
export function normalizeFaceBoxes(
    faces: DetectedFace[],
    detectionWidth: number,
    detectionHeight: number,
): DetectedFace[] {
    const detWidth = detectionWidth || 1
    const detHeight = detectionHeight || 1
    return faces.map((face) => ({
        ...face,
        boundingBox: {
            x1: face.boundingBox.x1 / detWidth,
            y1: face.boundingBox.y1 / detHeight,
            x2: face.boundingBox.x2 / detWidth,
            y2: face.boundingBox.y2 / detHeight,
        },
    }))
}

/**
 * Downscale the image before sending it to the ML engine, and normalize the
 * returned bounding boxes to 0..1 relative to the ORIGINAL (rotated) image.
 *
 * The ML engine's face boxes are pixel coordinates in the image it actually
 * received. Normalized coordinates are scale-invariant: a face at the center
 * of the detection image is also at the center of the original, so the
 * correct conversion is simply `pixel / detectionDimension`. No extra scale
 * factor is applied (multiplying by the resize ratio would double-count and
 * push boxes outside 0..1).
 *
 * EXIF orientation is baked into the detection copy via sharp's `.rotate()`
 * so the boxes are in the same rotated space the UI crops in (the thumb
 * endpoint also `.rotate()`s before `.extract()`).
 *
 * @returns normalized face boxes (0..1 relative to the original photo)
 */
async function downscaleAndDetect(imageBuffer: Buffer): Promise<DetectedFace[]> {
    const maxDimension = parseInt(
        process.env.MACHINE_LEARNING_FACE_MAX_DIMENSION || '2048',
        10,
    )

    const metadata = await sharp(imageBuffer).rotate().metadata()
    const originalWidth = metadata.width ?? 0
    const originalHeight = metadata.height ?? 0
    const needsOrientationFix = Boolean(metadata.orientation && metadata.orientation !== 1)
    const needsResize = originalWidth > maxDimension || originalHeight > maxDimension

    let detectionBuffer = imageBuffer
    let detectionWidth = originalWidth
    let detectionHeight = originalHeight

    if (needsResize) {
        detectionBuffer = await sharp(imageBuffer)
            .rotate()
            .resize(maxDimension, maxDimension, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality: 90, progressive: true })
            .toBuffer()

        const detMeta = await sharp(detectionBuffer).metadata()
        detectionWidth = detMeta.width || originalWidth
        detectionHeight = detMeta.height || originalHeight
    } else if (needsOrientationFix) {
        // Small image but EXIF-rotated: send an orientation-baked copy so the
        // boxes land in the same rotated space the UI expects.
        detectionBuffer = await sharp(imageBuffer)
            .rotate()
            .jpeg({ quality: 90, progressive: true })
            .toBuffer()
    }

    const detectedFaces = await detectFaces(detectionBuffer)

    return normalizeFaceBoxes(detectedFaces, detectionWidth, detectionHeight)
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

    const detectedFaces = await downscaleAndDetect(buffer)

    await db.$client`DELETE FROM faces WHERE "photoId" = ${photo.id}`
    if (detectedFaces.length === 0) return

    const now = BigInt(Math.floor(Date.now() / 1000))
    const faceRows: Array<typeof faces.$inferInsert> = []
    for (const face of detectedFaces) {
        const personId = await assignPerson(face.embedding)
        faceRows.push(toFaceRow(face, photo.id, personId, now))
    }

    await db.insert(faces).values(faceRows)
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
