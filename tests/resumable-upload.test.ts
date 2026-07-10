import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
    configuredChunkLimitBytes,
    configuredUploadLimitBytes,
    resumableRoot,
    resumableSessionDir,
    SHA256_RE,
} from '../server/utils/resumable-upload'

describe('resumable upload path and limit guards', () => {
    const originalStorageDir = process.env.STORAGE_DIR
    const originalFileLimit = process.env.MAX_FILE_SIZE_MB
    const originalChunkLimit = process.env.RESUMABLE_CHUNK_SIZE_MB

    beforeEach(() => {
        process.env.STORAGE_DIR = 'storage/test-uploads'
        ;(globalThis as any).createError = (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details)
    })

    afterEach(() => {
        process.env.STORAGE_DIR = originalStorageDir
        process.env.MAX_FILE_SIZE_MB = originalFileLimit
        process.env.RESUMABLE_CHUNK_SIZE_MB = originalChunkLimit
    })

    it('places valid opaque IDs beneath the resumable root', () => {
        const id = 'c21f969b-5f03-4a67-9e44-1fa616a7d551'
        expect(resumableSessionDir(id)).toBe(`${resumableRoot()}/${id}`)
    })

    it.each(['../../server', 'not-a-uuid', 'c21f969b-5f03-4a67-1e44-1fa616a7d551'])('rejects unsafe session ID %s', (id) => {
        expect(() => resumableSessionDir(id)).toThrow('Invalid upload session ID')
    })

    it('accepts only complete SHA-256 hex digests', () => {
        expect(SHA256_RE.test('a'.repeat(64))).toBe(true)
        expect(SHA256_RE.test('../' + 'a'.repeat(61))).toBe(false)
    })

    it('uses configured positive file and chunk limits with safe fallbacks', () => {
        process.env.MAX_FILE_SIZE_MB = '12'
        process.env.RESUMABLE_CHUNK_SIZE_MB = '2'
        expect(configuredUploadLimitBytes()).toBe(12 * 1024 * 1024)
        expect(configuredChunkLimitBytes()).toBe(2 * 1024 * 1024)

        process.env.MAX_FILE_SIZE_MB = '-1'
        process.env.RESUMABLE_CHUNK_SIZE_MB = 'invalid'
        expect(configuredUploadLimitBytes()).toBe(10 * 1024 * 1024)
        expect(configuredChunkLimitBytes()).toBe(3 * 1024 * 1024)
    })
})
