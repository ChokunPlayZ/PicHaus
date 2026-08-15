<template>
    <div
        class="absolute cursor-pointer overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5 active:scale-95 group"
        style="background: var(--surface-3);"
        :style="{
            outline: selected ? '3px solid var(--accent)' : 'none',
            outlineOffset: selected ? '2px' : '0',
            top: position.top !== undefined ? `${position.top}px` : undefined,
            left: position.left !== undefined ? `${position.left}px` : undefined,
            width: position.width !== undefined ? `${position.width}px` : undefined,
            height: position.height !== undefined ? `${position.height}px` : undefined,
        }"
        @click="$emit('click', $event)"
        @contextmenu.prevent="$emit('contextmenu', $event)"
    >
        <!-- Blurhash placeholder -->
        <img v-if="blurhashUrl" :src="blurhashUrl" aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover" />

        <!-- Thumbnail -->
        <img
            :src="buildAssetUrl(`/api/assets/thumb/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`)"
            :alt="photo.originalName || photo.id"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        />

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

        <!-- Processing overlay -->
        <div v-if="isProcessing"
            class="absolute inset-0 z-20 flex items-center justify-center bg-black/25">
            <Icon name="lucide:loader-2" class="w-6 h-6 text-white animate-spin" :stroke-width="2" />
        </div>
        <div v-if="photo.processingStatus === 'failed'"
            class="absolute top-2 left-2 z-20 w-6 h-6 rounded-full flex items-center justify-center"
            style="background: var(--error);" title="Processing failed">
            <Icon name="lucide:triangle-alert" class="w-3.5 h-3.5 text-white" :stroke-width="2.5" />
        </div>

        <!-- Selection badge -->
        <div v-if="selected"
            class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
            style="background: var(--accent);">
            <Icon name="lucide:check" class="h-4 w-4 text-accent-text" :stroke-width="2.5" />
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
            <div class="flex items-center gap-1.5">
                <span v-if="photo.aperture"
                    class="text-xs font-mono bg-black/40 px-1.5 py-0.5 rounded text-white backdrop-blur-md">
                    f/{{ photo.aperture }}
                </span>
                <!-- Three-dot action button -->
                <button
                    v-if="showActionMenu"
                    class="action-menu-btn"
                    aria-label="Photo actions"
                    @click.stop="$emit('action-menu', $event)"
                >
                    <Icon name="lucide:more-vertical" class="w-3.5 h-3.5" :stroke-width="2.5" />
                </button>
            </div>
        </div>

        <!-- Favorite button (public share) -->
        <button v-if="showFavorite"
            @click.stop="$emit('toggle-favorite')"
            class="absolute bottom-2 right-2 z-10 w-7 h-7 min-h-0 flex items-center justify-center rounded-full transition-all duration-200"
            :class="favorited
                ? 'favorite-active opacity-100'
                : 'bg-black/40 text-white/60 opacity-100 md:opacity-0 md:group-hover:opacity-100'">
            <Icon v-if="favorited" name="lucide:heart" class="h-3.5 w-3.5 fill-current" :stroke-width="2" />
            <Icon v-else name="lucide:heart" class="h-3.5 w-3.5" :stroke-width="2" />
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
    createdAt?: number | null
    updatedAt?: number | null
    processingStatus?: string | null
}

interface Position {
    top?: number
    left?: number
    width?: number
    height?: number
}

const props = defineProps<{
    photo: Photo
    position: Position
    selected?: boolean
    showHoverInfo?: boolean
    showFavorite?: boolean
    favorited?: boolean
    showActionMenu?: boolean
}>()

defineEmits<{
    click: [event: MouseEvent]
    contextmenu: [event: MouseEvent]
    'toggle-favorite': []
    'action-menu': [event: MouseEvent]
}>()

const blurhashUrl = computed(() => {
    const { blurhash, width, height } = props.photo
    if (!blurhash || !width || !height || !import.meta.client) return null
    const w = 32
    const h = Math.round(w * (height / width))
    return blurhashToDataUrl(blurhash, w, h) || null
})

const isProcessing = computed(() =>
    props.photo.processingStatus === 'pending' || props.photo.processingStatus === 'processing'
)
</script>

<style scoped>
.favorite-active {
    background: color-mix(in srgb, var(--error) 80%, transparent);
    color: var(--accent-text);
}
.action-menu-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.45);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease;
    backdrop-filter: blur(4px);
}
.action-menu-btn:hover {
    background: rgba(0, 0, 0, 0.7);
}
.action-menu-btn:active {
    transform: scale(0.92);
}
</style>
