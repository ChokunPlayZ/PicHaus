import { describe, expect, it } from 'vitest'
import { matchReferenceFaces, deduplicateReferenceFaces, type FaceSearchCandidate, type ReferenceFaceInput } from '../server/utils/face-search'

function candidate(photoId: string, embedding: number[]): FaceSearchCandidate {
    return {
        faceId: `${photoId}-face`,
        photoId,
        embedding,
        photo: {
            id: photoId,
            filename: `${photoId}.jpg`,
            originalName: `${photoId}.jpg`,
            size: 100,
            blurhash: null,
            width: 100,
            height: 100,
            dateTaken: null,
            createdAt: 1,
            updatedAt: null,
            uploader: null,
        },
    }
}

function referenceFace(embedding: number[], box?: { x1: number; y1: number; x2: number; y2: number }, score = 0.9): ReferenceFaceInput {
    return {
        box: box ?? { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.5 },
        score,
        embedding,
    }
}

describe('matchReferenceFaces', () => {
    it('matches the best photo per reference face above the threshold', () => {
        const alice = [1, 0, 0]
        const bob = [0, 1, 0]
        const candidates = [candidate('bob-photo', bob), candidate('alice-photo', alice)]

        const groups = matchReferenceFaces([referenceFace(alice)], candidates, { threshold: 0.5 })

        expect(groups).toHaveLength(1)
        expect(groups[0].matches.map(m => m.photo.id)).toEqual(['alice-photo'])
        expect(groups[0].matches[0].similarity).toBeCloseTo(1, 5)
    })

    it('finds every person in a group photo', () => {
        const alice = [1, 0, 0]
        const bob = [0, 1, 0]
        const candidates = [candidate('alice-photo', alice), candidate('bob-photo', bob)]

        const groups = matchReferenceFaces(
            [referenceFace(alice), referenceFace(bob)],
            candidates,
            { threshold: 0.5 },
        )

        expect(groups).toHaveLength(2)
        expect(groups[0].matches[0].photo.id).toBe('alice-photo')
        expect(groups[1].matches[0].photo.id).toBe('bob-photo')
    })

    it('drops faces below the similarity threshold', () => {
        const groups = matchReferenceFaces(
            [referenceFace([1, 0, 0])],
            [candidate('unrelated', [0, 1, 0])],
            { threshold: 0.5 },
        )

        expect(groups[0].matches).toEqual([])
    })

    it('keeps at most maxMatchesPerFace photos per face', () => {
        const embedding = [1, 0, 0]
        const candidates = Array.from({ length: 5 }, (_, i) => candidate(`photo-${i}`, embedding))

        const groups = matchReferenceFaces([referenceFace(embedding)], candidates, {
            threshold: 0.5,
            maxMatchesPerFace: 3,
        })

        expect(groups[0].matches).toHaveLength(3)
    })

    it('returns every matching photo when no cap is set', () => {
        const embedding = [1, 0, 0]
        const candidates = Array.from({ length: 50 }, (_, i) => candidate(`photo-${i}`, embedding))

        const groups = matchReferenceFaces([referenceFace(embedding)], candidates, { threshold: 0.5 })

        expect(groups[0].matches).toHaveLength(50)
    })

    it('returns empty groups when there are no candidates', () => {
        const groups = matchReferenceFaces([referenceFace([1, 0, 0])], [], { threshold: 0.5 })
        expect(groups).toHaveLength(1)
        expect(groups[0].matches).toEqual([])
    })

    it('merges duplicate detections of the same face in the same spot', () => {
        // Same embedding AND overlapping boxes → one group (the ML double-detected).
        const same = [1, 0, 0]
        const candidates = [candidate('alice-photo', same)]

        const groups = matchReferenceFaces(
            [
                referenceFace(same, { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.5 }, 0.9),
                referenceFace(same, { x1: 0.12, y1: 0.12, x2: 0.42, y2: 0.52 }, 0.7),
            ],
            candidates,
            { threshold: 0.5 },
        )

        expect(groups).toHaveLength(1)
        // Highest-scoring detection wins.
        expect(groups[0].score).toBe(0.9)
    })

    it('keeps legitimate repeated appearances of the same person in different spots', () => {
        // Same embedding but NON-overlapping boxes (mirror/collage/double
        // exposure/twins standing apart) → separate groups, both preserved.
        const same = [1, 0, 0]
        const candidates = [candidate('alice-photo', same)]

        const groups = matchReferenceFaces(
            [
                referenceFace(same, { x1: 0.05, y1: 0.05, x2: 0.35, y2: 0.45 }),
                referenceFace(same, { x1: 0.6, y1: 0.55, x2: 0.9, y2: 0.95 }),
            ],
            candidates,
            { threshold: 0.5 },
        )

        expect(groups).toHaveLength(2)
        expect(groups[0].matches).toHaveLength(1)
        expect(groups[1].matches).toHaveLength(1)
    })

    it('keeps similar-looking but different people when boxes do not overlap', () => {
        // Twins / lookalikes: near-identical embeddings but distinct spots.
        const twinA = [0.98, 0.2, 0]
        const twinB = [0.97, 0.21, 0.01]
        const candidates = [candidate('twin-a-photo', twinA), candidate('twin-b-photo', twinB)]

        const groups = matchReferenceFaces(
            [
                referenceFace(twinA, { x1: 0.05, y1: 0.05, x2: 0.35, y2: 0.45 }),
                referenceFace(twinB, { x1: 0.6, y1: 0.55, x2: 0.9, y2: 0.95 }),
            ],
            candidates,
            { threshold: 0.5 },
        )

        expect(groups).toHaveLength(2)
        expect(groups[0].matches[0].photo.id).toBe('twin-a-photo')
        expect(groups[1].matches[0].photo.id).toBe('twin-b-photo')
    })

    it('can disable deduplication', () => {
        const same = [1, 0, 0]
        const groups = matchReferenceFaces(
            [
                referenceFace(same, { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.5 }),
                referenceFace(same, { x1: 0.12, y1: 0.12, x2: 0.42, y2: 0.52 }),
            ],
            [candidate('alice-photo', same)],
            { threshold: 0.5, deduplicate: false },
        )
        expect(groups).toHaveLength(2)
    })
})
