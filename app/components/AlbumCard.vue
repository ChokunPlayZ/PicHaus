<template>
    <div
        class="rounded-xl overflow-hidden cursor-pointer group relative transition hover:-translate-y-0.5"
        role="button"
        tabindex="0"
        :aria-label="selectionMode ? `${selected ? 'Deselect' : 'Select'} ${album.name}` : `Open ${album.name}`"
        :aria-pressed="selectionMode ? !!selected : undefined"
        :style="selected
            ? 'background: var(--surface-1); border: 2px solid var(--accent); box-shadow: var(--shadow-md);'
            : 'background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);'"
        @click="$emit('click', $event)"
        @keydown.enter.prevent="$emit('click', $event)"
        @keydown.space.prevent="$emit('click', $event)"
        @contextmenu.prevent="$emit('contextmenu', $event)"
        @mouseover="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'"
        @mouseout="($event.currentTarget as HTMLElement).style.boxShadow = selected ? 'var(--shadow-md)' : 'var(--shadow-sm)'"
    >
        <!-- Selection badge -->
        <div v-if="selectionMode" class="absolute top-3 right-3 z-10">
            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                :style="selected
                    ? 'background: var(--accent); border-color: var(--accent);'
                    : 'background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.2);'">
                <Icon v-if="selected" name="lucide:check" class="w-3.5 h-3.5 text-white" :stroke-width="3" />
            </div>
        </div>

        <!-- Thumbnail -->
        <div class="aspect-video relative overflow-hidden" style="background: var(--surface-3);">
            <template v-if="album.coverPhoto">
                <div v-if="album.coverPhoto.blurhash"
                    class="absolute inset-0 bg-cover bg-center"
                    :style="{ backgroundImage: `url(${computeBlurhash(album.coverPhoto.blurhash)})` }" />
                <img
                    :src="buildAssetUrl(`/api/assets/thumb/${album.coverPhoto.id}`)"
                    class="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    @load="($event.target as HTMLElement).style.opacity = '1'"
                    style="opacity: 0;"
                />
            </template>
            <div v-else class="w-full h-full flex items-center justify-center">
                <Icon name="lucide:camera" class="w-7 h-7" style="color: var(--text-3);" :stroke-width="1.5" />
            </div>
        </div>

        <!-- Info -->
        <div class="p-3">
            <h3 class="font-semibold text-sm mb-0.5 truncate" style="color: var(--text-1);">{{ album.name }}</h3>
            <p v-if="album.description" class="text-xs mb-1.5 line-clamp-1" style="color: var(--text-2);">
                {{ album.description }}
            </p>
            <div v-if="album.tags && album.tags.length > 0" class="flex flex-wrap gap-1 mb-1.5">
                <span v-for="tag in album.tags" :key="tag"
                    class="px-1.5 py-0.5 rounded-full text-[10px]"
                    style="background: var(--surface-3); color: var(--text-2);">#{{ tag }}</span>
            </div>
            <div class="flex items-center justify-between text-[10px]" style="color: var(--text-3);">
                <span>{{ photoCount }} photos<template v-if="ownerName"> · {{ ownerName }}</template></span>
                <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'
import { blurhashToDataUrl } from '~/composables/useBlurhash'

interface Album {
    id: string
    name: string
    description?: string | null
    tags?: string[]
    eventDate?: number | null
    coverPhoto?: { id: string; blurhash: string | null } | null
}

defineProps<{
    album: Album
    photoCount: number
    ownerName?: string
    selected?: boolean
    selectionMode?: boolean
}>()

defineEmits<{
    click: [event: MouseEvent | KeyboardEvent]
    contextmenu: [event: MouseEvent]
}>()

const computeBlurhash = (hash: string) => import.meta.client ? blurhashToDataUrl(hash) : ''

const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
</script>
