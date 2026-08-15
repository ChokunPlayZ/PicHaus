import { cosineSimilarity } from './face-jobs'

export interface FaceSearchPhoto {
    id: string
    filename: string
    originalName: string
    size: number
    blurhash: string | null
    width: number | null
    height: number | null
    dateTaken: number | null
    createdAt: number
    updatedAt: number | null
    uploader: {
        id: string
        name: string | null
        instagram: string | null
        avatar: string | null
    } | null
}

export interface FaceSearchCandidate {
    faceId: string
    photoId: string
    embedding: number[]
    photo: FaceSearchPhoto
}

export interface ReferenceFaceInput {
    box: { x1: number; y1: number; x2: number; y2: number }
    score: number
    embedding: number[]
}

export interface FaceMatchResult {
    photo: FaceSearchPhoto
    similarity: number
}

export interface FaceMatchGroup {
    index: number
    box: { x1: number; y1: number; x2: number; y2: number }
    score: number
    matches: FaceMatchResult[]
}

export interface FaceMatchOptions {
    threshold: number
    maxMatchesPerFace?: number
}

// Matches every face found in a reference photo against the stored face
// candidates, keeping the best-scoring photo per face and sorting by
// similarity. Group photos naturally produce one group per detected person.
export function matchReferenceFaces(
    referenceFaces: ReferenceFaceInput[],
    candidates: FaceSearchCandidate[],
    options: FaceMatchOptions,
): FaceMatchGroup[] {
    const maxMatchesPerFace = options.maxMatchesPerFace ?? Number.POSITIVE_INFINITY

    return referenceFaces.map((reference, index) => {
        const bestByPhoto = new Map<string, FaceMatchResult>()

        for (const candidate of candidates) {
            const similarity = cosineSimilarity(reference.embedding, candidate.embedding)
            if (similarity < options.threshold) continue

            const existing = bestByPhoto.get(candidate.photoId)
            if (!existing || similarity > existing.similarity) {
                bestByPhoto.set(candidate.photoId, { photo: candidate.photo, similarity })
            }
        }

        return {
            index,
            box: reference.box,
            score: reference.score,
            matches: [...bestByPhoto.values()]
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, maxMatchesPerFace),
        }
    })
}
