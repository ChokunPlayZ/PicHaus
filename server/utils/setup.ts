import { count, eq } from 'drizzle-orm'
import { users } from '../db/schema'

export async function isSetupComplete(): Promise<boolean> {
    const [{ value }] = await db.select({ value: count() }).from(users)
    return value > 0
}

export async function isAdmin(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    return user?.role === 'ADMIN'
}
