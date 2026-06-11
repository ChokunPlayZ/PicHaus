import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const user = await requireAuth(event)
        return {
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                instagram: user.instagram,
                role: user.role,
                createdAt: Number(user.createdAt),
                avatar: user.avatarPath ? `/api/assets/avatar/${user.id}` : null,
            },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch user' })
    }
})
