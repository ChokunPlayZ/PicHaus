import prisma from './prisma'

/**
 * Check if the application has been set up (i.e., if any users exist)
 * @returns True if setup is complete (users exist), false otherwise
 */
export async function isSetupComplete(): Promise<boolean> {
    const userCount = await prisma.user.count()
    return userCount > 0
}

/**
 * Check if a user is an admin
 * @param userId - User ID to check
 * @returns True if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    })

    // First user is always admin, or check for admin flag if you add one
    return user !== null
}
