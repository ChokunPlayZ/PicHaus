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
          <Icon v-if="t.type === 'error'" name="lucide:circle-alert" class="w-5 h-5 flex-shrink-0 mt-0.5" :stroke-width="2" />
          <Icon v-else-if="t.type === 'success'" name="lucide:circle-check" class="w-5 h-5 flex-shrink-0 mt-0.5" :stroke-width="2" />
          <Icon v-else-if="t.type === 'warning'" name="lucide:triangle-alert" class="w-5 h-5 flex-shrink-0 mt-0.5" :stroke-width="2" />
          <Icon v-else name="lucide:circle-info" class="w-5 h-5 flex-shrink-0 mt-0.5" :stroke-width="2" />

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
