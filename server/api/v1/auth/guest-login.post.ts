import prisma from '../../../utils/prisma'
import { getUnixTimestamp } from '../../../utils/auth'
import { nanoid } from 'nanoid'

/**
 * Guest login via upload link
 */
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { token, name, email, password } = body

        if (!token || !name || !email) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Token, name, and email are required',
            })
        }

        // Find album
        const album = await prisma.album.findUnique({
            where: { uploadLink: token },
        })

        if (!album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Invalid upload link',
            })
        }

        // Verify password if required
        if (album.uploadPassword && album.uploadPassword !== password) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid album password',
            })
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    createdAt: getUnixTimestamp(),
                    updatedAt: getUnixTimestamp(),
                },
            })
        }

        // Add as collaborator if not already
        const existingCollaborator = await prisma.albumCollaborator.findUnique({
            where: {
                albumId_userId: {
                    albumId: album.id,
                    userId: user.id,
                },
            },
        })

        if (!existingCollaborator) {
            await prisma.albumCollaborator.create({
                data: {
                    albumId: album.id,
                    userId: user.id,
                    role: 'editor', // Allow uploading
                    createdAt: getUnixTimestamp(),
                },
            })
        }

        // Set session cookie
        setCookie(event, 'auth-token', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        return {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        }
    } catch (error: any) {
        console.error('Guest login error:', error)
        if (error.statusCode) throw error
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to login',
        })
    }
})
