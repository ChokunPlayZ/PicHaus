export type ThemePreference = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'theme'
export const ACCENT_STORAGE_KEY = 'pichaus-accent'

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

function readCookie(name: string): string | null {
    if (import.meta.server) return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length !== 2) return null
    return parts.pop()!.split(';')[0] ?? null
}

export function getThemeCookie(): ThemePreference | null {
    const value = readCookie(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
}

export function getThemePreference(): ThemePreference | null {
    if (import.meta.server) return null
    const cookie = getThemeCookie()
    if (cookie) return cookie
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
}

export function getSystemDark(): boolean {
    return !import.meta.server && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(): ThemePreference {
    return getThemePreference() ?? (getSystemDark() ? 'dark' : 'light')
}

export function applyThemeClass(theme: ThemePreference): void {
    if (import.meta.server) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function syncThemeToClass(): ThemePreference {
    if (import.meta.server) return 'light'
    const theme = resolveTheme()
    applyThemeClass(theme)
    return theme
}

export function setThemePreference(theme: ThemePreference): void {
    if (import.meta.server) return
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; SameSite=Lax`
}

export function getCachedAccent(): string | null {
    if (import.meta.server) return null
    const value = localStorage.getItem(ACCENT_STORAGE_KEY)
    return value && HEX_COLOR_RE.test(value) ? value : null
}

export function cacheAccent(color: string | null): void {
    if (import.meta.server) return
    if (color && HEX_COLOR_RE.test(color)) {
        localStorage.setItem(ACCENT_STORAGE_KEY, color)
    } else {
        localStorage.removeItem(ACCENT_STORAGE_KEY)
    }
}

export function applyAccentVars(color: string | null): void {
    if (import.meta.server) return
    const root = document.documentElement
    if (!color || !HEX_COLOR_RE.test(color)) {
        root.style.removeProperty('--accent')
        root.style.removeProperty('--accent-hover')
        root.style.removeProperty('--accent-pressed')
        root.style.removeProperty('--accent-light')
        cacheAccent(null)
        return
    }
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    root.style.setProperty('--accent', color)
    root.style.setProperty('--accent-hover', `rgba(${r},${g},${b},0.85)`)
    root.style.setProperty('--accent-pressed', `rgba(${r},${g},${b},0.75)`)
    root.style.setProperty('--accent-light', `rgba(${r},${g},${b},0.12)`)
    cacheAccent(color)
}
