<template>
  <Teleport to="body">
    <Transition name="dialog-backdrop">
      <div v-if="state?.open"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);"
        @click.self="resolveConfirm(false)">
        <Transition name="dialog-panel">
          <div v-if="state?.open"
            class="w-full max-w-sm rounded-2xl overflow-hidden"
            style="background: var(--surface-1); box-shadow: var(--shadow-xl);">

            <!-- Icon + Content -->
            <div class="px-6 pt-6 pb-4 text-center">
              <!-- Danger icon -->
              <div v-if="state.danger"
                class="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                style="background: var(--error-bg);">
                <Icon name="lucide:triangle-alert" class="w-6 h-6" style="color: var(--error);" :stroke-width="2" />
              </div>
              <!-- Info icon -->
              <div v-else
                class="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                style="background: var(--accent-light);">
                <Icon name="lucide:circle-help" class="w-6 h-6" style="color: var(--accent);" :stroke-width="2" />
              </div>

              <h3 v-if="state.title" class="text-base font-semibold mb-1" style="color: var(--text-1);">{{ state.title }}</h3>
              <p class="text-sm leading-relaxed" style="color: var(--text-2);">{{ state.message }}</p>
            </div>

            <!-- Divider -->
            <div style="height: 1px; background: var(--separator);"></div>

            <!-- Buttons -->
            <div class="flex">
              <button
                class="flex-1 py-3.5 text-sm font-medium transition-colors"
                style="color: var(--text-2);"
                @mouseenter="e => (e.target as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseleave="e => (e.target as HTMLElement).style.background = 'transparent'"
                @click="resolveConfirm(false)">
                Cancel
              </button>
              <div style="width: 1px; background: var(--separator);"></div>
              <button
                class="flex-1 py-3.5 text-sm font-semibold transition-colors"
                :style="state.danger ? 'color: var(--error)' : 'color: var(--accent)'"
                @mouseenter="e => (e.target as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseleave="e => (e.target as HTMLElement).style.background = 'transparent'"
                @click="resolveConfirm(true)">
                {{ state.danger ? 'Delete' : 'Confirm' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { confirmState: state, resolveConfirm } = useDialog()

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (!state.value?.open) return
    if (e.key === 'Escape') resolveConfirm(false)
    if (e.key === 'Enter') resolveConfirm(true)
  }
  window.addEventListener('keydown', onKey)
  onUnmounted(() => window.removeEventListener('keydown', onKey))
})
</script>

<style scoped>
.dialog-backdrop-enter-active,
.dialog-backdrop-leave-active { transition: opacity 0.2s ease; }
.dialog-backdrop-enter-from,
.dialog-backdrop-leave-to { opacity: 0; }

.dialog-panel-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.dialog-panel-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dialog-panel-enter-from { opacity: 0; transform: scale(0.95) translateY(8px); }
.dialog-panel-leave-to { opacity: 0; transform: scale(0.95); }
</style>
