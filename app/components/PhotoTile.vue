<template>
    <div
        class="absolute cursor-pointer overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5 active:scale-95 group"
        style="background: var(--surface-3);"
        :style="{
            outline: selected ? '3px solid var(--accent)' : 'none',
            outlineOffset: selected ? '2px' : '0',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            height: `${position.height}px`,
        }"
        @click="$emit('click', $event)"
        @contextmenu.prevent="$emit('contextmenu', $event)"
    >
        <!-- Blurhash placeholder -->
        <img v-if="blurhashUrl" :src="blurhashUrl" aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover" />

        <!-- Thumbnail -->
        <img
            :src="buildAssetUrl(`/api/assets/thumb/${photo.id}`)"
            :alt="photo.originalName || photo.id"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        />

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

        <!-- Selection badge -->
        <div v-if="selected"
            class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
            style="background: var(--accent);">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd" />
            </svg>
        </div>

        <!-- Hover info (My Gallery) -->
        <div v-if="showHoverInfo"
            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex justify-between items-end">
            <div class="overflow-hidden">
                <p class="text-white font-medium text-sm truncate">{{ photo.originalName }}</p>
                <div class="flex items-center gap-2 text-xs text-white/70 mt-0.5">
                    <span v-if="photo.cameraModel">{{ photo.cameraModel }}</span>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1">
                <span v-if="photo.aperture"
                    class="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-white backdrop-blur-md">
                    f/{{ photo.aperture }}
                </span>
                <span v-if="photo.iso" class="text-[10px] text-white/60">ISO {{ photo.iso }}</span>
            </div>
        </div>

        <!-- Favorite button (public share) -->
        <button v-if="showFavorite"
            @click.stop="$emit('toggle-favorite')"
            class="absolute bottom-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200"
            :class="favorited
                ? 'bg-red-500/80 text-white opacity-100'
                : 'bg-black/40 text-white/60 opacity-100 md:opacity-0 md:group-hover:opacity-100'">
            <svg v-if="favorited" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
        </button>
    </div>
</template>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'
import { blurhashToDataUrl } from '~/composables/useBlurhash'

interface Photo {
    id: string
    blurhash?: string | null
    width?: number | null
    height?: number | null
    originalName?: string
    cameraModel?: string | null
    aperture?: string | null
    iso?: number | null
}

interface Position {
    top: number
    left: number
    width: number
    height: number
}

const props = defineProps<{
    photo: Photo
    position: Position
    selected?: boolean
    showHoverInfo?: boolean
    showFavorite?: boolean
    favorited?: boolean
}>()

defineEmits<{
    click: [event: MouseEvent]
    contextmenu: [event: MouseEvent]
    'toggle-favorite': []
}>()

const blurhashUrl = computed(() => {
    const { blurhash, width, height } = props.photo
    if (!blurhash || !width || !height || !import.meta.client) return null
    const w = 32
    const h = Math.round(w * (height / width))
    return blurhashToDataUrl(blurhash, w, h) || null
})
</script>
