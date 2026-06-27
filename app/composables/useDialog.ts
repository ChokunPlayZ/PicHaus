interface ConfirmState {
  open: boolean
  message: string
  title?: string
  danger?: boolean
  resolve: (value: boolean) => void
}

interface Toast {
  id: number
  message: string
  type: 'error' | 'success' | 'warning' | 'info'
}

const confirmState = ref<ConfirmState | null>(null)
const toasts = ref<Toast[]>([])
let nextToastId = 0

export function useDialog() {
  function confirm(message: string, options?: { title?: string; danger?: boolean }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      confirmState.value = {
        open: true,
        message,
        title: options?.title,
        danger: options?.danger ?? false,
        resolve,
      }
    })
  }

  function toast(message: string, type: Toast['type'] = 'error') {
    const id = ++nextToastId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 5000)
  }

  function resolveConfirm(value: boolean) {
    if (confirmState.value) {
      confirmState.value.resolve(value)
      confirmState.value = null
    }
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { confirm, toast, confirmState, toasts, resolveConfirm, dismissToast }
}
