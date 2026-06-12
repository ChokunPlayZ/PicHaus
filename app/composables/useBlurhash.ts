import { decode } from 'blurhash'

const _cache = new Map<string, string>()

export function blurhashToDataUrl(hash: string, w = 32, h = 18): string {
    if (!hash) return ''
    const key = `${hash}:${w}:${h}`
    if (_cache.has(key)) return _cache.get(key)!
    try {
        const pixels = decode(hash, w, h)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.createImageData(w, h)
        imageData.data.set(pixels)
        ctx.putImageData(imageData, 0, 0)
        const dataUrl = canvas.toDataURL()
        _cache.set(key, dataUrl)
        return dataUrl
    } catch {
        return ''
    }
}
