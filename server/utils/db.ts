import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

declare const globalThis: {
    _pgClient?: postgres.Sql
} & typeof global

const queryClient = globalThis._pgClient ?? postgres(process.env.DATABASE_URL!)
if (process.env.NODE_ENV !== 'production') globalThis._pgClient = queryClient

export const db = drizzle(queryClient, { schema })
