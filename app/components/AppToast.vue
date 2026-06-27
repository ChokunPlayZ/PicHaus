<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-4 z-[10001] flex flex-col gap-2 items-end pointer-events-none"
      style="max-width: calc(100vw - 2rem);">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="flex items-start gap-3 px-4 py-3 rounded-xl pointer-events-auto cursor-default"
          style="
            min-width: 260px;
            max-width: 380px;
            box-shadow: var(--shadow-lg);
            backdrop-filter: blur(12px);
          "
          :style="toastStyle(t.type)"
          @click="dismissToast(t.id)">

          <!-- Icon -->
          <svg v-if="t.type === 'error'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <svg v-else-if="t.type === 'success'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <svg v-else-if="t.type === 'warning'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <svg v-else class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>

          <p class="text-sm leading-snug flex-1">{{ t.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts, dismissToast } = useDialog()

function toastStyle(type: string) {
  switch (type) {
    case 'error':
      return 'background: var(--surface-1); border: 1px solid var(--error-border); color: var(--error-text);'
    case 'success':
      return 'background: var(--surface-1); border: 1px solid var(--success-border); color: var(--success-text);'
    case 'warning':
      return 'background: var(--surface-1); border: 1px solid var(--warning-border); color: var(--warning-text);'
    default:
      return 'background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1);'
  }
}
</script>

<style scoped>
.toast-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(16px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateX(16px) scale(0.97); }
.toast-move { transition: transform 0.25s ease; }
</style>
