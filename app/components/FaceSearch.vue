<template>
    <div class="mb-8 rounded-2xl p-4 sm:p-6"
        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
        <!-- Hidden file input: opened automatically on mount -->
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
            @change="onFileChange" />

        <!-- Picker failed to auto-open (or user cancelled): minimal fallback -->
        <div v-if="!previewUrl && !picking"
            class="flex items-center justify-center gap-3 py-6 text-center">
            <button @click="openPicker"
                class="px-5 py-2.5 rounded-full text-sm font-semibold transition active:scale-95 text-accent-text inline-flex items-center gap-2"
                style="background: var(--accent);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                <Icon name="lucide:scan-face" class="h-4 w-4" :stroke-width="2" />
                {{ t('searchByFaceChoose') }}
            </button>
            <p v-if="error" class="text-sm max-w-xs" style="color: var(--error-text);">{{ error }}</p>
        </div>

        <!-- Searching -->
        <div v-else-if="searching" class="flex items-center justify-center gap-2.5 py-6">
            <div class="w-5 h-5 rounded-full border-2 animate-spin"
                style="border-color: var(--separator); border-top-color: var(--accent);"></div>
            <span class="text-sm" style="color: var(--text-2);">{{ t('searchByFaceSearching') }}</span>
        </div>

        <!-- Results (file bar hidden once done) -->
        <template v-else-if="done">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p v-if="resultFaces.length > 0" class="text-sm font-medium" style="color: var(--text-2);">{{ foundSummary }}</p>
                <button @click="startOver"
                    class="text-sm transition inline-flex items-center gap-1.5 ml-auto"
                    style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                    <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" :stroke-width="2" />
                    {{ t('searchByFaceNewSearch') }}
                </button>
            </div>

            <div v-if="resultFaces.length === 0" class="text-center py-8 rounded-xl"
                style="background: var(--surface-2); border: 1px solid var(--separator);">
                <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                    style="background: var(--surface-3); color: var(--text-3);">
                    <Icon name="lucide:user-round" class="h-5 w-5" :stroke-width="2" />
                </div>
                <p class="text-sm font-medium" style="color: var(--text-2);">{{ t('searchByFaceNoFaces') }}</p>
            </div>

            <div v-else class="space-y-4">
                <div v-for="face in resultFaces" :key="face.index"
                    class="rounded-xl p-4"
                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-14 h-14 rounded-full overflow-hidden relative flex-shrink-0"
                            style="border: 1px solid var(--separator); background: var(--surface-3);">
                            <img v-if="previewUrl" :src="previewUrl" alt="" aria-hidden="true"
                                class="absolute"
                                :style="faceCropStyle(face.box)" />
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold text-sm leading-tight truncate" style="color: var(--text-1);">
                                {{ t('searchByFacePerson').replace('{n}', String(face.index + 1)) }}
                            </p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">
                                {{ matchCountLabel(face.matches.length) }}
                            </p>
                        </div>
                    </div>

                    <div v-if="face.matches.length > 0">
                        <FaceMatchGrid :matches="face.matches" :favorited-map="favoritedMap" @open="openMatch"
                            @toggle-favorite="emit('toggle-favorite', $event)" />
                    </div>
                    <p v-else class="text-xs" style="color: var(--text-3);">{{ t('searchByFaceNoMatches') }}</p>
                </div>
            </div>
        </template>

        <!-- File selected, about to run -->
        <div v-else class="flex items-center justify-center gap-2.5 py-6">
            <span class="text-sm" style="color: var(--text-2);">{{ t('searchByFaceSearching') }}</span>
        </div>
    </div>

    <!-- Matched photo viewer -->
    <PhotoViewer v-if="viewerPhoto" :photo="viewerPhoto" :has-previous="hasPreviousMatch"
        :has-next="hasNextMatch" :show-metadata="true" @close="viewerIndex = null" @previous="previousMatch"
        @next="nextMatch" />
</template>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'
import { t, initLanguage } from '~/utils/i18n'

interface FaceBox {
    x1: number
    y1: number
    x2: number
    y2: number
}

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

interface FaceMatch {
    photo: FaceSearchPhoto
    similarity: number
}

interface FaceGroup {
    index: number
    box: FaceBox
    score: number
    matches: FaceMatch[]
}

const props = defineProps<{
    albumIds: string[]
    // The share page's favorites map (photoId -> true), same one the gallery
    // tiles use — hearts in the results share the exact favorite state.
    favoritedMap?: Record<string, boolean>
}>()

const emit = defineEmits<{
    'results-change': [hasResults: boolean]
    'toggle-favorite': [id: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
// Natural dimensions of the reference photo, used to correct the circle crop
// for object-fit: cover's aspect-cropping (a landscape photo crops
// horizontally inside the square element box, shifting the crop window).
const previewDims = ref<{ width: number; height: number } | null>(null)
const searchFile = ref<File | null>(null)
const searching = ref(false)
const done = ref(false)
const error = ref('')
const resultFaces = ref<FaceGroup[]>([])
// True while the native file picker is open (fallback button hidden).
const picking = ref(false)

const MAX_FILE_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

watch(() => props.albumIds, () => reset(), { deep: true })

const openPicker = () => {
    picking.value = true
    // Some browsers block programmatic click outside a user gesture; when that
    // happens the change event never fires, so reveal the fallback button.
    setTimeout(() => {
        if (!previewUrl.value && !searching.value && !done.value) {
            picking.value = false
        }
    }, 3000)
    fileInput.value?.click()
}

const startOver = () => {
    reset()
    openPicker()
}

onMounted(() => {
    initLanguage()
    // Pull up the file selector right away when the panel appears.
    nextTick(() => openPicker())
})

const reset = () => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
    previewDims.value = null
    searchFile.value = null
    searching.value = false
    done.value = false
    error.value = ''
    resultFaces.value = []
    viewerIndex.value = null
    picking.value = false
    if (fileInput.value) fileInput.value.value = ''
}

const acceptFile = (file: File | undefined) => {
    if (!file) return
    if (!ALLOWED_TYPES.has(file.type)) {
        error.value = t('searchByFaceBadType')
        picking.value = false
        return
    }
    if (file.size > MAX_FILE_BYTES) {
        error.value = t('searchByFaceTooLarge')
        picking.value = false
        return
    }
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(file)
    searchFile.value = file
    error.value = ''
    done.value = false
    resultFaces.value = []
    viewerIndex.value = null
    picking.value = false

    // Load natural dimensions so faceCropStyle can correct for object-fit:
    // cover's aspect cropping (the circle crop must land on the face box).
    const probe = new Image()
    probe.onload = () => {
        if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
            previewDims.value = { width: probe.naturalWidth, height: probe.naturalHeight }
        }
        runSearch()
    }
    probe.onerror = () => runSearch()
    probe.src = previewUrl.value
}

const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    if (files.length > 1) {
        error.value = t('searchByFaceSingleOnly')
        input.value = ''
        picking.value = false
        return
    }
    acceptFile(files[0])
}

const runSearch = async () => {
    if (searching.value || !searchFile.value || props.albumIds.length === 0) return

    searching.value = true
    done.value = false
    error.value = ''
    resultFaces.value = []

    try {
        const form = new FormData()
        form.append('image', searchFile.value)
        const url = `/api/v1/album/${props.albumIds[0]}/face-search?albums=${encodeURIComponent(props.albumIds.join(','))}`
        const response = await $fetch<{ success: boolean; data: { faces: FaceGroup[] } }>(url, {
            method: 'POST',
            body: form,
        })
        resultFaces.value = Array.isArray(response.data?.faces) ? response.data.faces : []
    } catch (err: any) {
        error.value = err.data?.statusMessage || t('searchByFaceError')
    } finally {
        searching.value = false
        done.value = true
    }
}

const foundSummary = computed(() => {
    const count = resultFaces.value.length
    return t('searchByFacePeopleFound')
        .replace('{count}', String(count))
        .replace('{noun}', count === 1 ? t('searchByFacePersonSingle') : t('searchByFacePersonPlural'))
})

const matchCountLabel = (count: number) => t('searchByFaceMatchCount')
    .replace('{count}', String(count))
    .replace('{noun}', count === 1 ? t('searchByFaceMatchSingle') : t('searchByFaceMatchPlural'))

// The circle thumbnail zooms the reference photo so the detected face fills
// the circle. The crop is a SQUARE window in pixel space (side = 1.4× the
// larger face dimension), so a square circle is filled without distortion.
//
// The img element is sized to the photo's real aspect ratio (no object-fit,
// no cropping) at a scale that maps the crop window onto the container:
//   scale = max(C / windowSidePx, C / min(W, H))
// (the second term guarantees the photo still covers the circle — no empty
// space even for extreme aspect ratios). The window center in img px is
// (winCxPx*scale, winCyPx*scale), so positioning it at the container center:
//   left% = 50 - winCxPx*scale/C*100,  top% = 50 - winCyPx*scale/C*100
const faceCropStyle = (box: FaceBox) => {
    const C = 56 // w-14 h-14 circle
    const dims = previewDims.value
    const W = dims && dims.width > 0 ? dims.width : 1
    const H = dims && dims.height > 0 ? dims.height : 1

    // Face box in photo pixels.
    const faceWPx = (box.x2 - box.x1) * W
    const faceHPx = (box.y2 - box.y1) * H
    // Square crop window side, 1.4× padding so the face isn't cropped tight.
    const windowSidePx = Math.max(faceWPx, faceHPx) * 1.4

    // Scale: fit the window to the circle, but never so small the photo stops
    // covering the circle on its shorter axis.
    const scale = Math.max(C / windowSidePx, C / Math.min(W, H))

    // Window center in photo px, clamped so the square window stays inside the
    // photo (edge faces keep the window in-bounds → no empty space).
    const rawCxPx = ((box.x1 + box.x2) / 2) * W
    const rawCyPx = ((box.y1 + box.y2) / 2) * H
    const winCxPx = Math.min(Math.max(rawCxPx, windowSidePx / 2), W - windowSidePx / 2)
    const winCyPx = Math.min(Math.max(rawCyPx, windowSidePx / 2), H - windowSidePx / 2)

    const widthPct = (W * scale) / C * 100
    const heightPct = (H * scale) / C * 100
    const leftPct = 50 - (winCxPx * scale) / C * 100
    const topPct = 50 - (winCyPx * scale) / C * 100

    return {
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        left: `${leftPct}%`,
        top: `${topPct}%`,
        maxWidth: 'none',
        maxHeight: 'none',
    }
}

const viewerPhotos = computed<FaceSearchPhoto[]>(() => resultFaces.value.flatMap(face => face.matches.map(m => m.photo)))
const viewerIndex = ref<number | null>(null)
const viewerPhoto = computed(() => {
    if (viewerIndex.value === null) return null
    return viewerPhotos.value[viewerIndex.value] || null
})
const hasPreviousMatch = computed(() => viewerIndex.value !== null && viewerIndex.value > 0)
const hasNextMatch = computed(() => viewerIndex.value !== null && viewerIndex.value < viewerPhotos.value.length - 1)

const openMatch = (photo: FaceSearchPhoto) => {
    const index = viewerPhotos.value.indexOf(photo)
    viewerIndex.value = index >= 0 ? index : 0
}

const previousMatch = () => {
    if (viewerIndex.value !== null && viewerIndex.value > 0) viewerIndex.value--
}

const nextMatch = () => {
    if (viewerIndex.value !== null && viewerIndex.value < viewerPhotos.value.length - 1) viewerIndex.value++
}

onUnmounted(() => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

// Exposed so the parent can trigger a fresh search when the user re-clicks
// the "Search by face" button while the panel is already open.
defineExpose({ startOver })

// Notify the parent when the search state changes (has faces or not), so it
// can decide whether to keep the album grid visible.
watch([done, searching, resultFaces], () => {
    emit('results-change', !searching.value && done.value && resultFaces.value.length > 0)
}, { immediate: true })
</script>
