<template>
    <div ref="containerRef" class="w-full">
        <div v-if="picturesLayout" class="relative w-full transition-opacity duration-300" :style="{ height: `${picturesLayout.containerHeight}px` }">
            <button v-for="(match, index) in matches" :key="match.photo.id" @click="openMatch(match.photo)"
                class="absolute overflow-hidden group cursor-pointer rounded-lg"
                :style="boxStyle(index)"
                @mouseover="($event.currentTarget as HTMLElement).style.outline = '2px solid var(--accent)'"
                @mouseout="($event.currentTarget as HTMLElement).style.outline = isFavorited(match.photo.id) ? '2px solid var(--accent)' : 'none'">
                <img :src="thumbUrl(match.photo)" :alt="match.photo.originalName || match.photo.id"
                    loading="lazy" decoding="async"
                    class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />

                <slot name="badge" :photo="match.photo" />

                <!-- Favorite button — same layout/placement as the gallery tiles
                     (bottom-right, circle, heart). Span with role so it doesn't
                     nest a button inside the tile button; inline min-height: 0
                     beats the mobile [role="button"] min-height rule so it stays
                     a circle on phones. -->
                <span v-if="showFavorite"
                    class="absolute bottom-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer"
                    :style="{
                        minHeight: '0',
                        ...(isFavorited(match.photo.id)
                            ? { background: 'color-mix(in srgb, var(--error) 80%, transparent)', color: 'var(--accent-text)' }
                            : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.6)' })
                    }"
                    role="button"
                    :aria-pressed="isFavorited(match.photo.id)"
                    :aria-label="isFavorited(match.photo.id) ? 'Remove favorite' : 'Add favorite'"
                    @click.stop="toggleFavorite(match.photo.id)"
                    @mouseover="($event.currentTarget as HTMLElement).style.opacity = '1'"
                    @mouseout="($event.currentTarget as HTMLElement).style.opacity = isFavorited(match.photo.id) ? '1' : ''">
                    <Icon v-if="isFavorited(match.photo.id)" name="lucide:heart" class="h-3.5 w-3.5 fill-current" :stroke-width="2" />
                    <Icon v-else name="lucide:heart" class="h-3.5 w-3.5" :stroke-width="2" />
                </span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'
// Same layout as the album/share grids — shared composable, no independent config.
import { useJustifiedLayout } from '~/composables/useJustifiedLayout'

interface FaceSearchPhoto {
    id: string
    filename: string
    originalName: string
    size: number
    blurhash: string | null
    width: number | null
    height: number | null
    dateTaken: number | null
    createdAt: number
    updatedAt: number | null
    uploader: {
        id: string
        name: string | null
        instagram: string | null
        avatar: string | null
    } | null
}

const props = withDefaults(defineProps<{
    matches: { photo: FaceSearchPhoto; similarity: number }[]
    favoritedMap?: Record<string, boolean>
    showFavorite?: boolean
}>(), {
    showFavorite: true,
})

const emit = defineEmits<{
    open: [photo: FaceSearchPhoto]
    'toggle-favorite': [id: string]
}>()

const photoDims = computed(() => props.matches.map(m => ({ width: m.photo.width, height: m.photo.height })))
const { containerRef, picturesLayout } = useJustifiedLayout(photoDims)

const boxStyle = (index: number) => {
    const box = picturesLayout.value?.getPosition(index)
    if (!box) return { display: 'none' }
    const match = props.matches[index]
    const style: Record<string, string> = {
        top: `${box.top}px`,
        left: `${box.left}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        background: 'var(--surface-3)',
    }
    // Persistent accent ring on favorited tiles
    if (match && isFavorited(match.photo.id)) {
        style.outline = '2px solid var(--accent)'
    }
    return style
}

const thumbUrl = (photo: FaceSearchPhoto) => {
    const cacheBuster = photo.updatedAt || photo.createdAt || ''
    return buildAssetUrl(`/api/assets/thumb/${photo.id}?t=${cacheBuster}`)
}

const openMatch = (photo: FaceSearchPhoto) => emit('open', photo)

const isFavorited = (id: string) => !!props.favoritedMap?.[id]
const toggleFavorite = (id: string) => emit('toggle-favorite', id)
</script>
