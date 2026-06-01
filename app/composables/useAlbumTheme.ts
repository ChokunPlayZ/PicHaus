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

export const useAlbumTheme = () => {
    const applyTheme = (preset: string | null | undefined) => {
        if (import.meta.server) return
        const key = (preset as ThemePreset) ?? 'default'
        const theme = ALBUM_THEMES[key] ?? ALBUM_THEMES.default
        const root = document.documentElement
        root.style.setProperty('--bg-primary-start', theme.bgStart)
        root.style.setProperty('--bg-primary-end', theme.bgEnd)
        root.style.setProperty('--btn-primary-start', theme.btnStart)
        root.style.setProperty('--btn-primary-end', theme.btnEnd)
        root.style.setProperty('--btn-primary-hover-start', theme.hoverStart)
        root.style.setProperty('--btn-primary-hover-end', theme.hoverEnd)
        root.style.setProperty('--text-secondary', theme.accentText)
        root.style.setProperty('--text-tertiary', theme.accentText)
    }

    const resetTheme = () => {
        if (import.meta.server) return
        const root = document.documentElement
        root.style.removeProperty('--bg-primary-start')
        root.style.removeProperty('--bg-primary-end')
        root.style.removeProperty('--btn-primary-start')
        root.style.removeProperty('--btn-primary-end')
        root.style.removeProperty('--btn-primary-hover-start')
        root.style.removeProperty('--btn-primary-hover-end')
        root.style.removeProperty('--text-secondary')
        root.style.removeProperty('--text-tertiary')
    }

    return { applyTheme, resetTheme, ALBUM_THEMES }
}
