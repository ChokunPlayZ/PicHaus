const state = reactive({ active: false, name: '' })
let delayTimer: ReturnType<typeof setTimeout> | null = null
let showTime = 0

export function useSplash() {
    function trigger(name: string) {
        state.name = name
        delayTimer = setTimeout(() => {
            state.active = true
            showTime = Date.now()
        }, 400)
    }

    async function dismiss() {
        if (delayTimer) {
            clearTimeout(delayTimer)
            delayTimer = null
        }
        if (state.active) {
            // keep visible for at least 600 ms so it doesn't flash away
            const remaining = 600 - (Date.now() - showTime)
            if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
            state.active = false
        }
    }

    return { splash: readonly(state), trigger, dismiss }
}
