export const ALBUM_THEMES = {
    default: {
        label: 'Purple',
        bgStart: '#5e4d56', bgEnd: '#3e3c5f',
        btnStart: '#f7c7d5', btnEnd: '#9995ee',
        hoverStart: '#f5b0c3', hoverEnd: '#8580e0',
        accentText: 'rgb(216 180 254)',
    },
    rose: {
        label: 'Rose',
        bgStart: '#5c2d3a', bgEnd: '#3b1c2c',
        btnStart: '#fba4c0', btnEnd: '#f472b6',
        hoverStart: '#f97fb5', hoverEnd: '#ec4899',
        accentText: 'rgb(251 207 232)',
    },
    ocean: {
        label: 'Ocean',
        bgStart: '#1a3a5c', bgEnd: '#0d2744',
        btnStart: '#7dd3fc', btnEnd: '#38bdf8',
        hoverStart: '#60c8fa', hoverEnd: '#0ea5e9',
        accentText: 'rgb(186 230 253)',
    },
    forest: {
        label: 'Forest',
        bgStart: '#1a3a2a', bgEnd: '#0d2217',
        btnStart: '#6ee7b7', btnEnd: '#34d399',
        hoverStart: '#4ade9e', hoverEnd: '#10b981',
        accentText: 'rgb(167 243 208)',
    },
    gold: {
        label: 'Gold',
        bgStart: '#4a3520', bgEnd: '#2c1e10',
        btnStart: '#fde68a', btnEnd: '#f59e0b',
        hoverStart: '#fcd34d', hoverEnd: '#d97706',
        accentText: 'rgb(253 230 138)',
    },
    midnight: {
        label: 'Midnight',
        bgStart: '#1e1b4b', bgEnd: '#0f0e2d',
        btnStart: '#a5b4fc', btnEnd: '#818cf8',
        hoverStart: '#818cf8', hoverEnd: '#6366f1',
        accentText: 'rgb(199 210 254)',
    },
    crimson: {
        label: 'Crimson',
        bgStart: '#4a1a1a', bgEnd: '#2d0d0d',
        btnStart: '#fca5a5', btnEnd: '#f87171',
        hoverStart: '#f97f7f', hoverEnd: '#ef4444',
        accentText: 'rgb(254 202 202)',
    },
    mono: {
        label: 'Mono',
        bgStart: '#2d2d2d', bgEnd: '#141414',
        btnStart: '#d4d4d4', btnEnd: '#a3a3a3',
        hoverStart: '#bdbdbd', hoverEnd: '#737373',
        accentText: 'rgb(212 212 212)',
    },
} as const

export type ThemePreset = keyof typeof ALBUM_THEMES

export interface CustomThemeColors {
    bgStart: string
    bgEnd: string
    btnStart: string
    btnEnd: string
}

export const DEFAULT_CUSTOM_THEME: CustomThemeColors = {
    bgStart: '#2d2d2d',
    bgEnd: '#141414',
    btnStart: '#d4d4d4',
    btnEnd: '#a3a3a3',
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`
    return `rgba(${r},${g},${b},${alpha})`
}

export const useAlbumTheme = () => {
    const applyTheme = (
        preset: string | null | undefined,
        customTheme?: CustomThemeColors | string | null,
        mode: 'accent' | 'full' = 'accent',
    ) => {
        if (import.meta.server) return
        const root = document.documentElement

        let bgStart: string, bgEnd: string, btnStart: string, btnEnd: string,
            hoverStart: string, hoverEnd: string, accentText: string

        if (preset === 'custom') {
            let colors: CustomThemeColors = DEFAULT_CUSTOM_THEME
            if (typeof customTheme === 'string') {
                try { colors = JSON.parse(customTheme) } catch { /* use defaults */ }
            } else if (customTheme) {
                colors = customTheme
            }
            bgStart = colors.bgStart
            bgEnd = colors.bgEnd
            btnStart = colors.btnStart
            btnEnd = colors.btnEnd
            hoverStart = btnStart
            hoverEnd = btnEnd
            accentText = btnEnd
        } else {
            const key = (preset as ThemePreset) ?? 'default'
            const theme = ALBUM_THEMES[key] ?? ALBUM_THEMES.default
            bgStart = theme.bgStart
            bgEnd = theme.bgEnd
            btnStart = theme.btnStart
            btnEnd = theme.btnEnd
            hoverStart = theme.hoverStart
            hoverEnd = theme.hoverEnd
            accentText = theme.accentText
        }

        // Legacy vars for backward compat (PhotoViewer, old templates)
        root.style.setProperty('--bg-primary-start', bgStart)
        root.style.setProperty('--bg-primary-end', bgEnd)
        root.style.setProperty('--btn-primary-start', btnStart)
        root.style.setProperty('--btn-primary-end', btnEnd)
        root.style.setProperty('--btn-primary-hover-start', hoverStart)
        root.style.setProperty('--btn-primary-hover-end', hoverEnd)

        // Apple system accent vars — applied in both modes
        root.style.setProperty('--accent', btnEnd)
        root.style.setProperty('--accent-hover', hoverEnd)
        root.style.setProperty('--accent-pressed', btnStart)
        root.style.setProperty('--accent-light', hexToRgba(btnEnd, 0.15))
        root.style.setProperty('--shadow-primary', hexToRgba(btnEnd, 0.25))

        if (mode === 'full') {
            root.style.setProperty('--bg-page', `linear-gradient(150deg, ${bgStart} 0%, ${bgEnd} 100%)`)
            root.style.setProperty('--surface-1', 'rgba(255,255,255,0.10)')
            root.style.setProperty('--surface-2', 'rgba(255,255,255,0.07)')
            root.style.setProperty('--surface-3', 'rgba(255,255,255,0.04)')
            root.style.setProperty('--sidebar-bg', 'rgba(0,0,0,0.15)')
            root.style.setProperty('--sidebar-border', 'rgba(255,255,255,0.12)')
            root.style.setProperty('--text-1', 'rgba(255,255,255,0.96)')
            root.style.setProperty('--text-2', 'rgba(255,255,255,0.72)')
            root.style.setProperty('--text-3', 'rgba(255,255,255,0.48)')
            root.style.setProperty('--text-link', accentText)
            root.style.setProperty('--separator', 'rgba(255,255,255,0.15)')
            root.style.setProperty('--separator-strong', 'rgba(255,255,255,0.28)')
            root.style.setProperty('--accent-text', '#1d1d1f')
            root.style.setProperty('--shadow-sm', '0 1px 4px rgba(0,0,0,0.25)')
            root.style.setProperty('--shadow-md', '0 4px 16px rgba(0,0,0,0.35)')
            root.style.setProperty('--shadow-lg', '0 12px 40px rgba(0,0,0,0.45)')
            root.style.setProperty('--shadow-xl', '0 24px 60px rgba(0,0,0,0.55)')
        }
    }

    const resetTheme = () => {
        if (import.meta.server) return
        const root = document.documentElement
        ;[
            '--bg-primary-start', '--bg-primary-end',
            '--btn-primary-start', '--btn-primary-end',
            '--btn-primary-hover-start', '--btn-primary-hover-end',
            '--accent', '--accent-hover', '--accent-pressed', '--accent-light', '--shadow-primary',
            '--bg-page', '--surface-1', '--surface-2', '--surface-3',
            '--sidebar-bg', '--sidebar-border',
            '--text-1', '--text-2', '--text-3', '--text-link',
            '--separator', '--separator-strong',
            '--accent-text',
            '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl',
        ].forEach(p => root.style.removeProperty(p))
    }

    return { applyTheme, resetTheme, ALBUM_THEMES }
}
