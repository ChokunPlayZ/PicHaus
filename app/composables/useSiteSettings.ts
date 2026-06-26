export interface SiteSettings {
    siteName: string
    accentColor: string | null
    logoImageUrl: string | null
    logoImageId: string | null
    allowRegistration: boolean
    googleOAuthEnabled: boolean
}

const _settings = ref<SiteSettings>({
    siteName: 'PicHaus',
    accentColor: null,
    logoImageUrl: null,
    logoImageId: null,
    allowRegistration: false,
    googleOAuthEnabled: false,
})
const _loaded = ref(false)

function applyAccent(color: string | null) {
    if (import.meta.server) return
    if (!color) {
        document.documentElement.style.removeProperty('--accent')
        document.documentElement.style.removeProperty('--accent-hover')
        document.documentElement.style.removeProperty('--accent-pressed')
        document.documentElement.style.removeProperty('--accent-light')
        return
    }
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    document.documentElement.style.setProperty('--accent', color)
    document.documentElement.style.setProperty('--accent-hover', `rgba(${r},${g},${b},0.85)`)
    document.documentElement.style.setProperty('--accent-pressed', `rgba(${r},${g},${b},0.75)`)
    document.documentElement.style.setProperty('--accent-light', `rgba(${r},${g},${b},0.12)`)
}

export const useSiteSettings = () => {
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
