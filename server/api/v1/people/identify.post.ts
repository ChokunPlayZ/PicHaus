import sharp from 'sharp'
import { eq, and, isNotNull, inArray } from 'drizzle-orm'
import { faces, people, photos } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { getVisibleAlbumIds } from '../../../utils/people'
import {
    detectFaces,
    type DetectedFace,
    MachineLearningRequestError,
    MachineLearningUnavailableError,
} from '../../../utils/machine-learning'
import { cosineSimilarity } from '../../../utils/face-jobs'
import { deduplicateReferenceFaces, type ReferenceFaceInput } from '../../../utils/face-search'
import { enforceRateLimit } from '../../../utils/rate-limit'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

// Photographer tool: upload a photo and get back WHO is in it. Each detected
// face is matched against the stored faces of people the current user can see
// (their albums), and the best-matching person is returned per face.
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    enforceRateLimit(event, { key: 'face-identify', limit: 30, windowMs: 60 * 60 * 1000 })

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No file provided' })
    }

    const imagePart = formData.find(part => part.name === 'image')
    if (!imagePart?.data || imagePart.data.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No image provided' })
    }
    if (imagePart.data.length > MAX_UPLOAD_BYTES) {
        throw createError({ statusCode: 413, statusMessage: 'Image is too large. Maximum size is 25 MB.' })
    }

    const mimeType = imagePart.type || ''
    if (!ALLOWED_TYPES.has(mimeType)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid file type. Use JPEG, PNG, or WebP.' })
    }

    let jpegBuffer: Buffer
    try {
        jpegBuffer = await sharp(imagePart.data)
            .rotate()
            .jpeg({ quality: 92 })
            .toBuffer()
    } catch {
        throw createError({ statusCode: 422, statusMessage: 'Could not read the uploaded photo' })
    }

    const metadata = await sharp(jpegBuffer).metadata()
    const imageWidth = metadata.width || 0
    const imageHeight = metadata.height || 0
    if (imageWidth <= 0 || imageHeight <= 0) {
        throw createError({ statusCode: 422, statusMessage: 'Could not read the uploaded photo' })
    }

    let detectedFaces: DetectedFace[]
    try {
        detectedFaces = await detectFaces(jpegBuffer)
    } catch (error) {
        if (error instanceof MachineLearningUnavailableError) {
            throw createError({
                statusCode: 503,
                statusMessage: 'Face identification is temporarily unavailable. Please try again later.',
            })
        }
        if (error instanceof MachineLearningRequestError) {
            throw createError({ statusCode: 422, statusMessage: 'Could not read the uploaded photo' })
        }
        throw error
    }

    if (detectedFaces.length === 0) {
        return { success: true, data: { faces: [] } }
    }

    // Only match against people whose faces live in albums this user can see.
    const visibleAlbumIds = await getVisibleAlbumIds(user.id)
    if (visibleAlbumIds.length === 0) {
        return { success: true, data: { faces: [] } }
    }

    const personRows = await db
        .select({
            personId: people.id,
            personName: people.name,
            personInstagram: people.instagram,
            representativeFaceId: people.representativeFaceId,
            embedding: faces.embedding,
        })
        .from(faces)
        .innerJoin(people, eq(faces.personId, people.id))
        .innerJoin(photos, eq(faces.photoId, photos.id))
        .where(and(
            isNotNull(faces.personId),
            isNotNull(faces.embedding),
            inArray(photos.albumId, visibleAlbumIds),
        ))

    // Group embeddings by person so we can take the best similarity per person.
    const embeddingsByPerson = new Map<string, { person: { id: string; name: string | null; instagram: string | null; representativeFaceId: string | null }; embeddings: number[][] }>()
    for (const row of personRows) {
        if (!row.personId || !Array.isArray(row.embedding) || row.embedding.length === 0) continue
        let entry = embeddingsByPerson.get(row.personId)
        if (!entry) {
            entry = {
                person: {
                    id: row.personId,
                    name: row.personName,
                    instagram: row.personInstagram,
                    representativeFaceId: row.representativeFaceId,
                },
                embeddings: [],
            }
            embeddingsByPerson.set(row.personId, entry)
        }
        entry.embeddings.push(row.embedding)
    }

    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.5')

    const referenceFaces: ReferenceFaceInput[] = detectedFaces.map(face => ({
        box: {
            x1: clamp(face.boundingBox.x1 / imageWidth, 0, 1),
            y1: clamp(face.boundingBox.y1 / imageHeight, 0, 1),
            x2: clamp(face.boundingBox.x2 / imageWidth, 0, 1),
            y2: clamp(face.boundingBox.y2 / imageHeight, 0, 1),
        },
        score: face.score,
        embedding: face.embedding,
    }))

    // Same person appearing twice in the photo (before/after, mirror) → one result.
    const uniqueFaces = deduplicateReferenceFaces(referenceFaces, threshold)

    const results = uniqueFaces.map((face, index) => {
        let bestPerson: { person: { id: string; name: string | null; instagram: string | null; representativeFaceId: string | null }; similarity: number } | null = null

        for (const [personId, entry] of embeddingsByPerson) {
            void personId
            let bestSimilarity = -1
            for (const embedding of entry.embeddings) {
                const similarity = cosineSimilarity(face.embedding, embedding)
                if (similarity > bestSimilarity) bestSimilarity = similarity
            }
            if (bestSimilarity >= threshold && (!bestPerson || bestSimilarity > bestPerson.similarity)) {
                bestPerson = { person: entry.person, similarity: bestSimilarity }
            }
        }

        return {
            index,
            box: face.box,
            score: face.score,
            person: bestPerson ? {
                id: bestPerson.person.id,
                name: bestPerson.person.name,
                instagram: bestPerson.person.instagram,
                representativeFaceId: bestPerson.person.representativeFaceId,
                representativeFaceUrl: bestPerson.person.representativeFaceId
                    ? `/api/v1/faces/${bestPerson.person.representativeFaceId}/thumb`
                    : null,
            } : null,
            similarity: bestPerson ? Math.round(bestPerson.similarity * 100) / 100 : null,
        }
    })

    return {
        success: true,
        data: { faces: results },
    }
})
