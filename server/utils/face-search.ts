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
    /**
     * When true (default), reference faces that are BOTH embedding-similar AND
     * spatially overlapping are treated as duplicate detections of the same
     * face and dropped, keeping only the highest-scoring detection. The ML
     * engine can return the same face twice with slightly different boxes.
     *
     * A person who legitimately appears multiple times in the reference photo
     * (mirror, collage, double exposure, twins standing apart) has NON-
     * overlapping boxes, so those groups are preserved — dedup only fires for
     * overlapping boxes, which cannot be a real second occurrence.
     */
    deduplicate?: boolean
    /**
     * Similarity at or above which two reference face embeddings are
     * considered the same person. Defaults to `options.threshold`.
     */
    duplicateThreshold?: number
    /**
     * Minimum intersection-over-union of the two face boxes for them to count
     * as duplicate detections of the same face. Defaults to 0.3.
     */
    duplicateIoU?: number
}

// Intersection-over-union of two normalized boxes.
function boxIoU(a: { x1: number; y1: number; x2: number; y2: number }, b: { x1: number; y1: number; x2: number; y2: number }): number {
    const x1 = Math.max(a.x1, b.x1)
    const y1 = Math.max(a.y1, b.y1)
    const x2 = Math.min(a.x2, b.x2)
    const y2 = Math.min(a.y2, b.y2)
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
    const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1)
    const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1)
    const union = areaA + areaB - intersection
    if (union <= 0) return 0
    return intersection / union
}

// Greedy duplicate removal: accepts faces in descending detection score order
// and drops any face that is BOTH embedding-similar AND box-overlapping with
// an already-accepted one. This merges the ML engine's repeated detections of
// the same face in the same spot while preserving legitimate repeated
// appearances of a person in different parts of the reference photo.
export function deduplicateReferenceFaces(
    referenceFaces: ReferenceFaceInput[],
    threshold: number,
    iouThreshold = 0.3,
): ReferenceFaceInput[] {
    if (referenceFaces.length <= 1) return referenceFaces

    const accepted: ReferenceFaceInput[] = []
    // Highest score first so the strongest detection of a face wins.
    const byScoreDesc = [...referenceFaces].sort((a, b) => b.score - a.score)

    for (const face of byScoreDesc) {
        const isDuplicate = accepted.some(
            (existing) =>
                cosineSimilarity(face.embedding, existing.embedding) >= threshold &&
                boxIoU(face.box, existing.box) >= iouThreshold,
        )
        if (!isDuplicate) accepted.push(face)
    }

    // Restore the original index order so group numbers match the boxes drawn
    // on the reference photo (accepted faces are a subset of the input).
    const acceptedIds = new Set(accepted)
    return referenceFaces.filter((face) => acceptedIds.has(face))
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
    const deduplicate = options.deduplicate ?? true
    const duplicateThreshold = options.duplicateThreshold ?? options.threshold
    const duplicateIoU = options.duplicateIoU ?? 0.3

    const uniqueFaces = deduplicate
        ? deduplicateReferenceFaces(referenceFaces, duplicateThreshold, duplicateIoU)
        : referenceFaces

    return uniqueFaces.map((reference, index) => {
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
