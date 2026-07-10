import { eq } from 'drizzle-orm'
import { albums, users } from '../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../utils/auth'
import { normalizeTags, serializeAlbum } from '../../../utils/albums'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        const body = await readBody(event)
        const tags = normalizeTags(body.tags)

        if (!body.name) throw createError({ statusCode: 400, statusMessage: 'Album name is required' })

        const now = getUnixTimestamp()

        const [album] = await db.insert(albums).values({
            title: body.name,
            description: body.description || null,
            tags,
            eventDate: body.eventDate ? BigInt(body.eventDate) : null,
            isPublic: body.isPublic ?? false,
            ownerId: user.id,
            createdAt: now,
            updatedAt: now,
        }).returning()

        if (!album) throw createError({ statusCode: 500, statusMessage: 'Failed to create album' })

        const owner = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: { id: true, name: true, email: true },
        })

        return {
            success: true,
            message: 'Album created successfully',
            data: {
                ...serializeAlbum(album),
                owner,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to create album' })
    }
})
