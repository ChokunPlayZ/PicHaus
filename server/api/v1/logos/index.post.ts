import { randomBytes } from 'crypto'
import { logos } from '../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../utils/auth'
import { saveFile, validateImageFile } from '../../../utils/upload'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const formData = await readMultipartFormData(event)
    if (!formData) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

    const fileField = formData.find(f => f.name === 'file')
    if (!fileField?.data) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

    const buffer = Buffer.from(fileField.data)
    const validation = validateImageFile(buffer, 2)
    if (!validation.valid) throw createError({ statusCode: 400, statusMessage: validation.error })

    const mimeType = fileField.type ?? 'image/png'
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
    if (!allowedTypes.has(mimeType)) throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })

    const ext = mimeType === 'image/png' ? 'png'
        : mimeType === 'image/webp' ? 'webp'
        : mimeType === 'image/gif' ? 'gif'
        : mimeType === 'image/svg+xml' ? 'svg'
        : 'jpg'

    const filename = `logo_${randomBytes(8).toString('hex')}_${Date.now()}.${ext}`
    const storagePath = await saveFile(buffer, filename, 'logos')

    const [logo] = await db.insert(logos).values({
        storagePath,
        originalName: fileField.filename ?? filename,
        mimeType,
        uploadedById: user.id,
        uploadedAt: getUnixTimestamp(),
    }).returning()

    return {
        success: true,
        data: {
            id: logo.id,
            originalName: logo.originalName,
            mimeType: logo.mimeType,
            uploadedAt: Number(logo.uploadedAt),
            url: `/api/assets/logo/${logo.id}`,
        },
    }
})
