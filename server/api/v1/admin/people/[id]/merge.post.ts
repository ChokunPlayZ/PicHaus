import { eq, and } from 'drizzle-orm'
import { people, faces } from '../../../../../db/schema'
import { requireAuth } from '../../../../../utils/auth'
import { invalidatePersonCentroidCache } from '../../../../../utils/face-jobs'

export default defineEventHandler(async (event) => {
    const targetId = getRouterParam(event, 'id')
    if (!targetId) throw createError({ statusCode: 400, statusMessage: 'Target person ID is required' })

    const user = await requireAuth(event)
    if (user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })

    const body = await readBody(event)
    const sourcePersonId: string | undefined = body?.sourcePersonId
    if (typeof sourcePersonId !== 'string' || !sourcePersonId) {
        throw createError({ statusCode: 400, statusMessage: 'sourcePersonId is required' })
    }
    if (sourcePersonId === targetId) {
        throw createError({ statusCode: 400, statusMessage: 'Cannot merge a person into themselves' })
    }

    const [target, source] = await Promise.all([
        db.query.people.findFirst({ where: eq(people.id, targetId) }),
        db.query.people.findFirst({ where: eq(people.id, sourcePersonId) }),
    ])
    if (!target) throw createError({ statusCode: 404, statusMessage: 'Target person not found' })
    if (!source) throw createError({ statusCode: 404, statusMessage: 'Source person not found' })

    await db.transaction(async (tx) => {
        await tx.update(faces)
            .set({ personId: targetId })
            .where(eq(faces.personId, sourcePersonId))

        if (!target.representativeFaceId && source.representativeFaceId) {
            const targetFace = await tx.query.faces.findFirst({
                columns: { id: true },
                where: and(
                    eq(faces.personId, targetId),
                    eq(faces.id, source.representativeFaceId),
                ),
            })
            if (targetFace) {
                await tx.update(people)
                    .set({ representativeFaceId: targetFace.id, updatedAt: BigInt(Math.floor(Date.now() / 1000)) })
                    .where(eq(people.id, targetId))
            }
        }

        await tx.delete(people).where(eq(people.id, sourcePersonId))
    })

    invalidatePersonCentroidCache()

    return {
        success: true,
        message: `Merged "${source.name ?? sourcePersonId}" into "${target.name ?? targetId}"`,
    }
})
