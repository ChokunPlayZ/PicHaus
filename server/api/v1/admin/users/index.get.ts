import prisma from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/auth'

/**
 * List all users (Admin only)
 */
export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)

        if (user.role !== 'ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        }

        const query = getQuery(event)
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 50
        const search = query.search as string | undefined

        const skip = (page - 1) * limit

        const where: any = {}
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ]
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    _count: {
                        select: {
                            ownedAlbums: true,
                            uploadedPhotos: true,
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ])

        return {
            success: true,
            data: users.map(u => ({
                ...u,
                createdAt: Number(u.createdAt),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        }

    } catch (error: any) {
        console.error('List users error:', error)
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to list users' })
    }
})
