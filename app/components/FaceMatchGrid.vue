<template>
    <div ref="containerRef" class="w-full">
        <div v-if="picturesLayout" class="relative w-full transition-opacity duration-300" :style="{ height: `${picturesLayout.containerHeight}px` }">
            <button v-for="(match, index) in matches" :key="match.photo.id" @click="openMatch(match.photo)"
                class="absolute overflow-hidden group cursor-pointer rounded-lg"
                :style="boxStyle(index)"
                @mouseover="($event.currentTarget as HTMLElement).style.outline = '2px solid var(--accent)'"
                @mouseout="($event.currentTarget as HTMLElement).style.outline = isSelected(match.photo.id) ? '3px solid var(--accent)' : 'none'">
                <img :src="thumbUrl(match.photo)" :alt="match.photo.originalName || match.photo.id"
                    loading="lazy" decoding="async"
                    class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />

                <!-- Selection toggle (span with role so it doesn't nest a button inside the tile button).
                     Inline min-height: 0 beats variables.css's mobile [role="button"] min-height
                     (same specificity, order-dependent) — keeps it a circle on phones. -->
                <span
                    class="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-6 h-6 rounded-full transition-transform active:scale-90"
                    :style="{
                        minHeight: '0',
                        ...(isSelected(match.photo.id)
                            ? { background: 'var(--accent)', boxShadow: '0 0 0 2px rgba(255,255,255,0.45)' }
                            : { background: 'rgba(0,0,0,0.45)', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.35)' })
                    }"
                    role="button"
                    :aria-pressed="isSelected(match.photo.id)"
                    :aria-label="`Select ${match.photo.originalName || match.photo.id}`"
                    @click.stop="toggleSelect(match.photo.id)">
                    <Icon v-if="isSelected(match.photo.id)" name="lucide:check" class="h-3.5 w-3.5 text-white" :stroke-width="3" />
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

const props = defineProps<{
    matches: { photo: FaceSearchPhoto; similarity: number }[]
    selectedMap?: Record<string, boolean>
}>()

const emit = defineEmits<{
    open: [photo: FaceSearchPhoto]
    'toggle-select': [id: string]
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
    // Persistent selected outline (hover outline is handled by mouseover/out)
    if (match && isSelected(match.photo.id)) {
        style.outline = '3px solid var(--accent)'
        style.outlineOffset = '2px'
    }
    return style
}

const thumbUrl = (photo: FaceSearchPhoto) => {
    const cacheBuster = photo.updatedAt || photo.createdAt || ''
    return buildAssetUrl(`/api/assets/thumb/${photo.id}?t=${cacheBuster}`)
}

const openMatch = (photo: FaceSearchPhoto) => emit('open', photo)

const isSelected = (id: string) => !!props.selectedMap?.[id]
const toggleSelect = (id: string) => emit('toggle-select', id)
</script>
