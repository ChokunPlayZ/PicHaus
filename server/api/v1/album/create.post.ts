import prisma from '../../../utils/prisma'
import { hashPassword, getUnixTimestamp } from '../../../utils/auth'
import { nanoid } from 'nanoid'

/**
 * Create a new album
 */
export default defineEventHandler(async (event) => {
    try {
        // Get authenticated user
        const authToken = getCookie(event, 'auth-token')

        if (!authToken) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Not authenticated',
            })
        }

        const body = await readBody(event)

        // Validate required fields
        if (!body.name) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Album name is required',
            })
        }

        const now = getUnixTimestamp()

        // Generate upload link token
        const uploadLinkToken = nanoid(32)
        const uploadPassword = body.uploadLinkPassword
            ? await hashPassword(body.uploadLinkPassword)
            : null

        // Create album
        const album = await prisma.album.create({
            data: {
                title: body.name,
                description: body.description || null,
                eventDate: body.eventDate ? BigInt(body.eventDate) : null,
                isPublic: body.isPublic ?? false,
                ownerId: authToken,
                uploadLink: uploadLinkToken,
                uploadPassword,
                createdAt: now,
                updatedAt: now,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return {
            success: true,
            message: 'Album created successfully',
            data: {
                ...album,
                name: album.title, // Map title to name for frontend
                createdAt: Number(album.createdAt),
                updatedAt: Number(album.updatedAt),
                eventDate: album.eventDate ? Number(album.eventDate) : null,
                uploadLinkToken: album.uploadLink, // Map uploadLink to uploadLinkToken for frontend
            },
        }
    } catch (error: any) {
        console.error('Error creating album:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create album',
        })
    }
})
