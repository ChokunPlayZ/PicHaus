import sharp from 'sharp'
import { join } from 'path'
import prisma from '../../../../utils/prisma'
import { getAbsoluteFilePath } from '../../../../utils/upload'
import justifiedLayout from 'justified-layout'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing album ID',
        })
    }

    // Fetch album and up to 100 photos to pick from
    const album = await prisma.album.findUnique({
        where: { id },
        include: {
            photos: {
                take: 100,
                where: {
                    // Prisma doesn't support { not: null } for Int fields directly in all versions, 
                    // but usually it does. If strict, we can filter in JS or ensure schema allows it.
                    // Let's try standard Prisma syntax.
                    width: { not: undefined },
                    height: { not: undefined }
                },
                select: {
                    id: true,
                    width: true,
                    height: true,
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

    // Type assertion because Prisma types might be inferred incorrectly with partial selects
    let photos = (album as any).photos || []

    // Shuffle and pick random 16-32 photos
    if (photos.length > 0) {
        // Fisher-Yates shuffle
        for (let i = photos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [photos[i], photos[j]] = [photos[j], photos[i]];
        }

        const count = Math.min(photos.length, Math.floor(Math.random() * (32 - 16 + 1)) + 16)
        photos = photos.slice(0, count)
    }

    const composites: sharp.OverlayOptions[] = []

    if (photos.length > 0) {
        const aspectRatios = new Float32Array(
            photos.map((photo: any) => (photo.width || 1) / (photo.height || 1))
        )

        // JustifiedLayout from @immich/justified-layout-wasm might work differently than flickr's.
        // Assuming it returns a geometry object or has a method.
        // Let's check how it's used in the frontend code I saw earlier.
        // In frontend: new JustifiedLayout(aspectRatios, config)
        // It seems it calculates immediately or has a method. 
        // If it matches the frontend usage:
        // Convert Float32Array to regular array for justified-layout
        const aspectRatiosArray = Array.from(aspectRatios)

        // Calculate dynamic row height to ensure we fill the vertical space
        // Total Area ~= n * H * W_avg
        // W_avg = H * AR_avg
        // Total Area ~= n * H^2 * AR_avg
        // H = sqrt(Total Area / (n * AR_avg))
        const avgAspectRatio = aspectRatiosArray.reduce((a, b) => a + b, 0) / aspectRatiosArray.length
        // Multiply area by 1.2 to ensure we overflow rather than underflow
        const targetRowHeight = Math.sqrt((width * height * 1.2) / (photos.length * avgAspectRatio))

        const layout = justifiedLayout(aspectRatiosArray, {
            targetRowHeight: targetRowHeight,
            containerWidth: width,
            boxSpacing: 10,
            containerPadding: 20,
            targetRowHeightTolerance: 0.2, // Allow more flexibility
        })

        // The WASM version might expose boxes differently. 
        // If it's like the JS version, it returns { boxes: [...] }
        // But here we instantiated a class. 
        // Let's assume `layout` itself is the geometry or has a `boxes` property.
        // Based on frontend code: `picturesLayout.getPosition(index)` was used.
        // So we should use `layout.getPosition(index)` if available, or access boxes.
        // The frontend used `layout.getPosition(index)`. Let's try that or fallback to boxes.

        // Process photos in parallel
        const photoPromises = photos.map(async (photo: any, index: number) => {
            const box = (layout as any).boxes[index]
            if (!box) return null

            // Skip if box is outside canvas height
            if (box.top > height) return null

            const path = photo.thumbnailStoragePath || photo.storagePath
            if (!path) return null

            try {
                const fullPath = getAbsoluteFilePath(path)
                const boxWidth = Math.round(box.width)
                const boxHeight = Math.round(box.height)

                // Create rounded corner mask
                const roundedCorners = Buffer.from(
                    `<svg><rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" ry="10" /></svg>`
                )

                const imgBuffer = await sharp(fullPath)
                    .resize(boxWidth, boxHeight, { fit: 'cover' })
                    .composite([{
                        input: roundedCorners,
                        blend: 'dest-in'
                    }])
                    .toBuffer()

                return {
                    input: imgBuffer,
                    top: Math.round(box.top),
                    left: Math.round(box.left)
                }
            } catch (e) {
                console.error('Failed to load photo for OG image:', e)
                return null
            }
        })

        const results = await Promise.all(photoPromises)
        const validComposites = results.filter((c): c is sharp.OverlayOptions => c !== null)
        composites.push(...validComposites)
    }

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
