import { eq, and, ne } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { requireAuth, hashPassword } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const body = await readBody(event)
        const { name, email, instagram, password } = body

        const updateData: Partial<typeof users.$inferInsert> = {}

        if (name !== undefined) updateData.name = name
        if (instagram !== undefined) updateData.instagram = instagram

        if (email && email !== currentUser.email) {
            const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
            if (existing) throw createError({ statusCode: 400, statusMessage: 'Email already in use' })
            updateData.email = email
        }

        if (password) {
            if (password.length < 6) throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters' })
            updateData.passwordHash = await hashPassword(password)
        }

        const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, currentUser.id)).returning({
            id: users.id, name: users.name, email: users.email, instagram: users.instagram, role: users.role, createdAt: users.createdAt,
        })

        return { success: true, data: { ...updatedUser, createdAt: Number(updatedUser.createdAt) } }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update profile' })
    }
})
