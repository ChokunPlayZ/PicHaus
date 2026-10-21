<template>
    <div class="space-y-2.5">
        <label class="flex items-center gap-2.5 cursor-pointer">
            <input :id="`${id}-public`" type="checkbox" :checked="visibility === 'public'"
                class="w-4 h-4 rounded" style="accent-color: var(--accent);"
                @change="visibility = ($event.target as HTMLInputElement).checked ? 'public' : 'private'" />
            <span class="text-sm" :style="{ color: muted ? 'var(--text-2)' : 'var(--text-1)' }">Make album public</span>
        </label>
        <div>
            <label class="flex items-center gap-2.5 cursor-pointer">
                <input :id="`${id}-community`" type="checkbox" :checked="visibility === 'community'"
                    :aria-describedby="`${id}-help`" class="w-4 h-4 rounded" style="accent-color: var(--accent);"
                    @change="visibility = ($event.target as HTMLInputElement).checked ? 'community' : 'private'" />
                <span class="text-sm" :style="{ color: muted ? 'var(--text-2)' : 'var(--text-1)' }">Make album visible to the community</span>
            </label>
            <p :id="`${id}-help`" class="text-xs mt-1.5 ml-6" style="color: var(--text-3);">
                Every signed-in user on this instance can view. Uploading and editing still require permission.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ id: string; muted?: boolean }>()
const visibility = defineModel<'private' | 'community' | 'public'>({ default: 'private' })
</script>
