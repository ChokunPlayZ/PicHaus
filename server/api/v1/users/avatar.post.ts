import { eq } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { users } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    const currentUser = await requireAuth(event)

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No file provided' })
    }

    const filePart = formData.find(p => p.name === 'avatar')
    if (!filePart?.data) {
        throw createError({ statusCode: 400, statusMessage: 'No avatar file in request' })
    }

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    const mimeType = filePart.type || 'image/jpeg'
    if (!allowedTypes.has(mimeType)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' })
    }

    // Resize to 256x256 square, WebP
    const resized = await sharp(filePart.data)
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer()

    const storageBase = process.env.STORAGE_DIR || 'storage/uploads'
    const avatarDir = join(process.cwd(), storageBase, 'avatars')
    await mkdir(avatarDir, { recursive: true })

    const fileName = `${currentUser.id}.webp`
    const filePath = join(avatarDir, fileName)
    await writeFile(filePath, resized)

    const avatarPath = `avatars/${fileName}`

    await db.update(users)
        .set({ avatarPath, updatedAt: BigInt(Date.now()) })
        .where(eq(users.id, currentUser.id))

    return {
        success: true,
        data: { avatarUrl: `/api/assets/avatar/${currentUser.id}` },
    }
})
