import { eq } from 'drizzle-orm'
import { albums, users } from '../../../db/schema'
import { getUnixTimestamp, requireAuth } from '../../../utils/auth'

const normalizeTags = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const normalized = value.map(tag => (typeof tag === 'string' ? tag.trim() : '')).filter(tag => tag.length > 0)
    return Array.from(new Set(normalized))
}

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

        const owner = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: { id: true, name: true, email: true },
        })

        return {
            success: true,
            message: 'Album created successfully',
            data: {
                ...album,
                name: album.title,
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                owner,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to create album' })
    }
})
