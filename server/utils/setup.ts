import { count, eq } from 'drizzle-orm'
import { users } from '../db/schema'

export async function isSetupComplete(): Promise<boolean> {
    const result = await db.select({ value: count() }).from(users)
    const value = result[0]?.value ?? 0
    return value > 0
}

export async function isAdmin(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    return user?.role === 'ADMIN'
}
