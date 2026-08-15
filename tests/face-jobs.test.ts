import { describe, expect, it } from 'vitest'
import { normalizeFaceBoxes } from '../server/utils/face-jobs'
import type { DetectedFace } from '../server/utils/machine-learning'

const face = (x1: number, y1: number, x2: number, y2: number): DetectedFace => ({
    boundingBox: { x1, y1, x2, y2 },
    score: 0.99,
    embedding: [0.1, 0.2, 0.3],
})

describe('normalizeFaceBoxes (downscaled detection)', () => {
    it('converts detection pixels to 0..1 original-relative coordinates', () => {
        // Original 4000x3000, detection image 2048x1536 (downscaled 1.953x)
        const faces = normalizeFaceBoxes(
            [face(512, 384, 1536, 1152)],
            2048,
            1536,
        )

        // Same relative position in both spaces → normalized values equal
        expect(faces[0]!.boundingBox.x1).toBeCloseTo(0.25)
        expect(faces[0]!.boundingBox.y1).toBeCloseTo(0.25)
        expect(faces[0]!.boundingBox.x2).toBeCloseTo(0.75)
        expect(faces[0]!.boundingBox.y2).toBeCloseTo(0.75)
    })

    it('is scale-invariant — a center face stays centered', () => {
        const center = normalizeFaceBoxes(
            [face(1024, 768, 2048, 1536)],
            2048,
            1536,
        )
        expect(center[0]!.boundingBox.x1).toBeCloseTo(0.5)
        expect(center[0]!.boundingBox.y1).toBeCloseTo(0.5)
        expect(center[0]!.boundingBox.x2).toBeCloseTo(1.0)
        expect(center[0]!.boundingBox.y2).toBeCloseTo(1.0)
    })

    it('no-op when the image was not downscaled (detection dims == original)', () => {
        const faces = normalizeFaceBoxes(
            [face(1000, 500, 2000, 1500)],
            4000,
            3000,
        )
        expect(faces[0]!.boundingBox.x1).toBeCloseTo(0.25)
        expect(faces[0]!.boundingBox.y1).toBeCloseTo(0.1667)
        expect(faces[0]!.boundingBox.x2).toBeCloseTo(0.5)
        expect(faces[0]!.boundingBox.y2).toBeCloseTo(0.5)
    })

    it('never produces coordinates outside 0..1 for valid input', () => {
        const faces = normalizeFaceBoxes(
            [face(0, 0, 2048, 1536)],
            2048,
            1536,
        )
        for (const f of faces) {
            for (const value of [f.boundingBox.x1, f.boundingBox.y1, f.boundingBox.x2, f.boundingBox.y2]) {
                expect(value).toBeGreaterThanOrEqual(0)
                expect(value).toBeLessThanOrEqual(1)
            }
        }
    })

    it('preserves embeddings and score', () => {
        const [f] = normalizeFaceBoxes([face(1, 2, 3, 4)], 100, 100)
        expect(f!.score).toBe(0.99)
        expect(f!.embedding).toEqual([0.1, 0.2, 0.3])
    })
})
