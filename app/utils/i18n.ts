import { ref } from 'vue'
import en from '~/locales/en'
import th from '~/locales/th'

export const translations = {
    en,
    th
}

export const currentLang = ref<'en' | 'th'>('en')

export const initLanguage = () => {
    if (typeof navigator !== 'undefined') {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
        if (lang.toLowerCase().startsWith('th')) {
            currentLang.value = 'th'
        } else {
            currentLang.value = 'en'
        }
    }
}

export const t = (key: keyof typeof translations.en) => {
    return translations[currentLang.value][key] || translations.en[key]
}
