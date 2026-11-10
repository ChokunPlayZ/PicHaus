import { eq, isNull, or } from 'drizzle-orm'
import { photos } from '../db/schema'

// Photos uploaded before background processing was introduced have a null status.
export const photoIsReady = () => or(isNull(photos.processingStatus), eq(photos.processingStatus, 'completed'))!
