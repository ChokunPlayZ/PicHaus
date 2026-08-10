import { applyAccentVars } from '~/utils/theme'

export interface SiteSettings {
    siteName: string
    accentColor: string | null
    logoImageUrl: string | null
    logoImageId: string | null
    allowRegistration: boolean
    googleOAuthEnabled: boolean
    googleOAuthShiftBypassEnabled: boolean
    googleButtonText: string | null
    googleButtonLogoUrl: string | null
    microsoftOAuthEnabled: boolean
    microsoftButtonText: string | null
    microsoftButtonLogoUrl: string | null
}

function applyAccent(color: string | null) {
    applyAccentVars(color)
}

export const useSiteSettings = () => {
    const _settings = useState<SiteSettings>('siteSettings', () => ({
        siteName: 'PicHaus',
        accentColor: null,
        logoImageUrl: null,
        logoImageId: null,
        allowRegistration: false,
        googleOAuthEnabled: false,
        googleOAuthShiftBypassEnabled: false,
        googleButtonText: null,
        googleButtonLogoUrl: null,
        microsoftOAuthEnabled: false,
        microsoftButtonText: null,
        microsoftButtonLogoUrl: null,
    }))
    const _loaded = useState<boolean>('siteSettingsLoaded', () => false)

    const loadSettings = async () => {
        if (_loaded.value) return
        try {
            const res = await $fetch<{ success: boolean; data: SiteSettings }>('/api/v1/site-settings')
            _settings.value = res.data
            _loaded.value = true
            applyAccent(res.data.accentColor)
        } catch {
            _loaded.value = true
        }
    }

    const refreshSettings = async () => {
        _loaded.value = false
        await loadSettings()
    }

    return { settings: _settings, loadSettings, refreshSettings, applyAccent }
}
