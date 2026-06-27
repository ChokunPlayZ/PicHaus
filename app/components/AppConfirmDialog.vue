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
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="color: var(--error);">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <!-- Info icon -->
              <div v-else
                class="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
                style="background: var(--accent-light);">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="color: var(--accent);">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
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
