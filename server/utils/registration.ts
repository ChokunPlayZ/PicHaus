import { eq } from 'drizzle-orm'
import { siteSettings } from '../db/schema'

export async function getRegistrationPolicy() {
    const row = await db.query.siteSettings.findFirst({
        where: eq(siteSettings.id, 1),
        columns: {
            allowRegistration: true,
            googleOAuthEnabled: true,
            googleOAuthAllowedDomain: true,
            googleOAuthShiftBypassEnabled: true,
            microsoftOAuthEnabled: true,
            microsoftOAuthTenantId: true,
        },
    })

    return {
        allowRegistration: row?.allowRegistration ?? false,
        googleOAuthEnabled: row?.googleOAuthEnabled ?? false,
        googleOAuthAllowedDomain: row?.googleOAuthAllowedDomain ?? null,
        googleOAuthShiftBypassEnabled: row?.googleOAuthShiftBypassEnabled ?? false,
        microsoftOAuthEnabled: row?.microsoftOAuthEnabled ?? false,
        microsoftOAuthTenantId: row?.microsoftOAuthTenantId ?? null,
    }
}
