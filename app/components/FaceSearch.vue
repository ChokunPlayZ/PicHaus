<template>
    <div class="mb-8 rounded-2xl p-4 sm:p-6"
        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
        <!-- Upload dropzone -->
        <div v-if="!previewUrl" @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false"
            @drop.prevent="onDrop" @click="fileInput?.click()"
            class="rounded-xl border-2 border-dashed p-6 sm:p-10 flex flex-col items-center justify-center text-center transition cursor-pointer"
            :style="dragActive
                ? 'border-color: var(--accent); background: var(--accent-light);'
                : 'border-color: var(--separator-strong); background: var(--surface-2);'">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style="background: var(--accent-light); color: var(--accent);">
                <Icon name="lucide:scan-face" class="h-6 w-6" :stroke-width="2" />
            </div>
            <p class="text-sm font-medium mb-1" style="color: var(--text-1);">{{ t('searchByFacePrompt') }}</p>
            <p class="text-xs" style="color: var(--text-3);">JPEG, PNG, WebP</p>
            <button @click.stop="fileInput?.click()"
                class="mt-4 px-5 py-2 rounded-full text-sm font-semibold transition active:scale-95 text-accent-text"
                style="background: var(--accent);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                <Icon name="lucide:upload" class="h-4 w-4 -mt-0.5 mr-1.5" :stroke-width="2" />
                {{ t('searchByFaceChoose') }}
            </button>
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
                @change="onFileChange" />
        </div>

        <!-- Reference preview -->
        <div v-else>
            <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div class="relative inline-block max-w-full flex-shrink-0">
                    <img :src="previewUrl" alt="Reference photo"
                        class="block max-h-[50vh] min-h-48 w-auto mx-auto rounded-xl"
                        style="max-width: 100%; background: var(--surface-2);" />
                    <div v-for="face in resultFaces" :key="face.index"
                        class="absolute border-2 rounded-lg pointer-events-none flex items-start"
                        :style="boxOverlayStyle(face.box)">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md -mt-5 -ml-1"
                            style="background: var(--accent); color: var(--accent-text);">
                            {{ face.index + 1 }}
                        </span>
                    </div>
                </div>

                <div class="flex flex-col items-center sm:items-start gap-3 w-full sm:w-auto">
                    <div v-if="searching" class="flex items-center gap-2.5">
                        <div class="w-5 h-5 rounded-full border-2 animate-spin"
                            style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                        <span class="text-sm" style="color: var(--text-2);">{{ t('searchByFaceSearching') }}</span>
                    </div>
                    <button v-else-if="!done" @click="runSearch"
                        class="px-5 py-2.5 rounded-full text-sm font-semibold transition active:scale-95 text-accent-text inline-flex items-center gap-2"
                        style="background: var(--accent);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <Icon name="lucide:search" class="h-4 w-4" :stroke-width="2" />
                        {{ t('searchByFaceRun') }}
                    </button>
                    <button v-else @click="reset()"
                        class="px-5 py-2.5 rounded-full text-sm font-semibold transition active:scale-95 inline-flex items-center gap-2"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <Icon name="lucide:refresh-cw" class="h-4 w-4" :stroke-width="2" />
                        {{ t('searchByFaceNewSearch') }}
                    </button>
                    <button @click="reset()"
                        class="text-sm transition inline-flex items-center gap-1.5"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <Icon name="lucide:x" class="h-3.5 w-3.5" :stroke-width="2" />
                        {{ t('clear') }}
                    </button>
                    <p v-if="error" class="text-sm max-w-xs" style="color: var(--error-text);">{{ error }}</p>
                </div>
            </div>

            <!-- Results -->
            <template v-if="done && !searching">
                <div v-if="resultFaces.length === 0" class="mt-6 text-center py-8 rounded-xl"
                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                        style="background: var(--surface-3); color: var(--text-3);">
                        <Icon name="lucide:user-round" class="h-5 w-5" :stroke-width="2" />
                    </div>
                    <p class="text-sm font-medium" style="color: var(--text-2);">{{ t('searchByFaceNoFaces') }}</p>
                </div>

                <div v-else class="mt-6 space-y-4">
                    <p class="text-sm font-medium" style="color: var(--text-2);">{{ foundSummary }}</p>
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
                            <FaceMatchGrid :matches="face.matches" @open="openMatch" />
                        </div>
                        <p v-else class="text-xs" style="color: var(--text-3);">{{ t('searchByFaceNoMatches') }}</p>
                    </div>
                </div>
            </template>
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
}>()

onMounted(() => initLanguage())

const fileInput = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
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

const MAX_FILE_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

watch(() => props.albumIds, () => reset(), { deep: true })

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
    if (fileInput.value) fileInput.value.value = ''
}

const acceptFile = (file: File | undefined) => {
    if (!file) return
    if (!ALLOWED_TYPES.has(file.type)) {
        error.value = t('searchByFaceBadType')
        return
    }
    if (file.size > MAX_FILE_BYTES) {
        error.value = t('searchByFaceTooLarge')
        return
    }
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(file)
    searchFile.value = file
    error.value = ''
    done.value = false
    resultFaces.value = []
    viewerIndex.value = null

    // Load natural dimensions so faceCropStyle can correct for object-fit:
    // cover's aspect cropping (the circle crop must land on the face box).
    const probe = new Image()
    probe.onload = () => {
        if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
            previewDims.value = { width: probe.naturalWidth, height: probe.naturalHeight }
        }
    }
    probe.src = previewUrl.value
}

const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])
    if (files.length > 1) {
        error.value = t('searchByFaceSingleOnly')
        input.value = ''
        return
    }
    acceptFile(files[0])
}

const onDrop = (event: DragEvent) => {
    dragActive.value = false
    const files = Array.from(event.dataTransfer?.files || [])
    if (files.length > 1) {
        error.value = t('searchByFaceSingleOnly')
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

const boxOverlayStyle = (box: FaceBox) => ({
    left: `${box.x1 * 100}%`,
    top: `${box.y1 * 100}%`,
    width: `${(box.x2 - box.x1) * 100}%`,
    height: `${(box.y2 - box.y1) * 100}%`,
    borderColor: 'var(--accent)',
    background: 'rgba(var(--accent-rgb), 0.12)',
})

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
</script>
