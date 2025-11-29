import sharp from 'sharp'
import { join } from 'path'
import prisma from '../../../../utils/prisma'
import { getAbsoluteFilePath } from '../../../../utils/upload'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing album ID',
        })
    }

    // Fetch album and latest 4 photos
    const album = await prisma.album.findUnique({
        where: { id },
        include: {
            photos: {
                take: 4,
                orderBy: { createdAt: 'desc' },
                select: {
                    storagePath: true,
                    thumbnailStoragePath: true,
                }
            }
        }
    })

    if (!album) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Album not found',
        })
    }

    // Canvas dimensions (Open Graph standard)
    const width = 1200
    const height = 630

    // Create base background
    let composite = sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 20, g: 20, b: 20, alpha: 1 }
        }
    })

    const photos = album.photos
    const composites: sharp.OverlayOptions[] = []

    if (photos.length > 0) {
        // Load and resize photos based on count
        const photoBuffers = await Promise.all(photos.map(async (photo: any) => {
            const path = photo.thumbnailStoragePath || photo.storagePath
            if (!path) return null
            try {
                const fullPath = getAbsoluteFilePath(path)
                return await sharp(fullPath).toBuffer()
            } catch (e) {
                console.error('Failed to load photo for OG image:', e)
                return null
            }
        }))

        const validBuffers = photoBuffers.filter((b: Buffer | null): b is Buffer => b !== null)

        if (validBuffers.length === 1) {
            // 1 photo: Full cover
            const img = await sharp(validBuffers[0])
                .resize(width, height, { fit: 'cover' })
                .toBuffer()
            composites.push({ input: img, top: 0, left: 0 })
        } else if (validBuffers.length === 2) {
            // 2 photos: Split vertical
            const w = width / 2
            const img1 = await sharp(validBuffers[0]).resize(w, height, { fit: 'cover' }).toBuffer()
            const img2 = await sharp(validBuffers[1]).resize(w, height, { fit: 'cover' }).toBuffer()
            composites.push({ input: img1, top: 0, left: 0 })
            composites.push({ input: img2, top: 0, left: w })
        } else if (validBuffers.length === 3) {
            // 3 photos: 1 big left, 2 small right
            const w1 = Math.floor(width * 0.6)
            const w2 = width - w1
            const h2 = height / 2

            const img1 = await sharp(validBuffers[0]).resize(w1, height, { fit: 'cover' }).toBuffer()
            const img2 = await sharp(validBuffers[1]).resize(w2, h2, { fit: 'cover' }).toBuffer()
            const img3 = await sharp(validBuffers[2]).resize(w2, h2, { fit: 'cover' }).toBuffer()

            composites.push({ input: img1, top: 0, left: 0 })
            composites.push({ input: img2, top: 0, left: w1 })
            composites.push({ input: img3, top: h2, left: w1 })
        } else if (validBuffers.length >= 4) {
            // 4 photos: 2x2 grid
            const w = width / 2
            const h = height / 2

            const img1 = await sharp(validBuffers[0]).resize(w, h, { fit: 'cover' }).toBuffer()
            const img2 = await sharp(validBuffers[1]).resize(w, h, { fit: 'cover' }).toBuffer()
            const img3 = await sharp(validBuffers[2]).resize(w, h, { fit: 'cover' }).toBuffer()
            const img4 = await sharp(validBuffers[3]).resize(w, h, { fit: 'cover' }).toBuffer()

            composites.push({ input: img1, top: 0, left: 0 })
            composites.push({ input: img2, top: 0, left: w })
            composites.push({ input: img3, top: h, left: 0 })
            composites.push({ input: img4, top: h, left: w })
        }
    }

    // Add dark overlay for text readability
    composites.push({
        input: Buffer.from(`
            <svg width="${width}" height="${height}">
                <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(0,0,0,0.4)" />
            </svg>
        `),
        top: 0,
        left: 0
    })

    // Add Title Text
    // We use SVG for text rendering
    const title = album.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const svgText = `
        <svg width="${width}" height="${height}">
            <style>
                .title { fill: white; font-size: 80px; font-family: sans-serif; font-weight: bold; }
                .subtitle { fill: #ddd; font-size: 40px; font-family: sans-serif; }
            </style>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title">${title}</text>
            <text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle" class="subtitle">${album.photos.length} Photos</text>
        </svg>
    `

    composites.push({
        input: Buffer.from(svgText),
        top: 0,
        left: 0
    })

    // Generate final image
    const finalImage = await composite
        .composite(composites)
        .png()
        .toBuffer()

    setHeaders(event, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
    })

    return finalImage
})
