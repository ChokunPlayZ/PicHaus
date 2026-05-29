import { eq } from 'drizzle-orm'
import { passkeys } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')

    if (!id) throw createError({ statusCode: 400, statusMessage: 'Passkey ID is required' })

    const passkey = await db.query.passkeys.findFirst({ where: eq(passkeys.id, id) })

    if (!passkey || passkey.userId !== user.id) {
        throw createError({ statusCode: 404, statusMessage: 'Passkey not found' })
    }

    await db.delete(passkeys).where(eq(passkeys.id, id))
    return { success: true }
})
