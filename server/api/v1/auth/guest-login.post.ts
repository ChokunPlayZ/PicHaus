import prisma from '../../../utils/prisma'
import { getUnixTimestamp, getAuthUserId, createAccessToken } from '../../../utils/auth'
import argon2 from 'argon2'

/**
 * Guest login via share link
 */
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { token, password } = body
        let { name, email, instagram } = body
        const now = getUnixTimestamp()

        if (!token) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Token is required',
            })
        }

        // Find share link
        const shareLink = await prisma.shareLink.findUnique({
            where: { token },
            include: {
                album: true,
                shareGroup: true
            }
        })

        if (!shareLink) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Invalid link',
            })
        }

        if (shareLink.expiresAt && shareLink.expiresAt < now) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Invalid link',
            })
        }

        // Verify password if required
        if (shareLink.password) {
            if (!password) {
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Password required',
                })
            }
            const valid = await argon2.verify(shareLink.password, password)
            if (!valid) {
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Invalid password',
                })
            }
        }

        // Update link views
        await prisma.shareLink.update({
            where: { id: shareLink.id },
            data: { views: { increment: 1 } }
        })

        // Handle Share Group
        if (shareLink.shareGroupId && shareLink.shareGroup) {
            setCookie(event, `group-access-${shareLink.shareGroupId}`, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            })

            return {
                success: true,
                data: {
                    type: 'group',
                    groupId: shareLink.shareGroupId,
                    groupTitle: shareLink.shareGroup.title,
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        if (!shareLink.albumId || !shareLink.album) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Album not found',
            })
        }

        // For view-only links, just grant session access without creating user
        if (shareLink.type === 'view') {
            // Set a session cookie indicating authenticated access to this album
            setCookie(event, `album-access-${shareLink.albumId}`, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            })

            return {
                success: true,
                data: {
                    albumId: shareLink.albumId,
                    albumName: shareLink.album.title,
                    type: 'view',
                    showMetadata: shareLink.showMetadata,
                },
            }
        }

        // For upload links, create/find user and add as collaborator
        // Check if user is already logged in
        const authUserId = getAuthUserId(event)
        let user: any = null

        if (authUserId) {
            user = await prisma.user.findUnique({
                where: { id: authUserId },
            })
        }

        if (!user) {
            if (email) {
                // Find or create by email
                user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: name || email.split('@')[0],
                            instagram: instagram || null,
                            createdAt: getUnixTimestamp(),
                            updatedAt: getUnixTimestamp(),
                        },
                    })
                } else if (instagram && !user.instagram) {
                    // Update IG if missing
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { instagram },
                    })
                }
            } else {
                // Create anonymous user
                user = await prisma.user.create({
                    data: {
                        name: name || 'Guest',
                        instagram: instagram || null,
                        createdAt: getUnixTimestamp(),
                        updatedAt: getUnixTimestamp(),
                    },
                })
            }
        }

        // Add as collaborator if not already
        const existingCollaborator = await prisma.albumCollaborator.findUnique({
            where: {
                albumId_userId: {
                    albumId: shareLink.albumId,
                    userId: user.id,
                },
            },
        })

        if (!existingCollaborator) {
            await prisma.albumCollaborator.create({
                data: {
                    albumId: shareLink.albumId,
                    userId: user.id,
                    role: 'editor', // Upload links always get editor role
                    createdAt: getUnixTimestamp(),
                },
            })
        }

        const accessToken = await createAccessToken(user.id)

        return {
            success: true,
            data: {
            accessToken,
                id: user.id,
                name: user.name,
                email: user.email,
                albumId: shareLink.albumId, // Return albumId for redirect
                showMetadata: shareLink.showMetadata,
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
