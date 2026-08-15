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
                        <FaceMatchGrid :matches="face.matches" :selected-map="selectedMap" @open="openMatch"
                            @toggle-select="toggleSelect" />
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

    <!-- Selected results download bar -->
    <Transition name="slide-up">
        <div v-if="selectedCount > 0 && !viewerPhoto"
            class="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full px-5 py-3 flex items-center gap-4 z-40 whitespace-nowrap"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="text-sm font-medium pr-4 flex items-center gap-2" style="color: var(--text-1); border-right: 1px solid var(--separator);">
                <Icon name="lucide:check-square" class="h-4 w-4 text-accent flex-shrink-0" :stroke-width="2" />
                <span>{{ t('selectedCount').replace('{count}', String(selectedCount)).replace('{plural}', selectedCount === 1 ? t('photo') : t('photos')) }}</span>
            </div>
            <button @click="clearSelection" class="text-sm transition" style="color: var(--text-2);">
                {{ t('clear') }}
            </button>
            <div class="h-4 w-px" style="background: var(--separator);"></div>
            <button @click="downloadSelected" :disabled="downloading"
                class="flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-45" style="color: var(--text-1);">
                <Icon name="lucide:download" class="h-4 w-4" :stroke-width="2" />
                <span v-if="downloading">{{ downloadProgress.current }}/{{ downloadProgress.total }}</span>
                <span v-else>{{ t('download') }}</span>
            </button>
        </div>
    </Transition>

    <!-- Download Progress Modal -->
    <div v-if="downloading"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);">
        <div class="rounded-2xl p-6 max-w-sm w-full"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <h3 class="text-base font-bold mb-4 text-center" style="color: var(--text-1);">
                {{ t('downloadingPhotos') }}
            </h3>
            <div class="mb-2 flex justify-between text-sm">
                <span style="color: var(--text-2);">{{ t('progress') }}</span>
                <span style="color: var(--accent); font-weight: 600;">{{ Math.round((downloadProgress.current / downloadProgress.total) * 100) }}%</span>
            </div>
            <div class="w-full rounded-full h-2 mb-4 overflow-hidden" style="background: var(--surface-3);">
                <div class="h-full rounded-full transition-all duration-300 ease-out"
                    style="background: var(--accent);"
                    :style="{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }">
                </div>
            </div>
            <p class="text-center text-xs" style="color: var(--text-3);">
                {{ downloadProgress.current }} / {{ downloadProgress.total }} {{ t('filesProcessed') }}
            </p>
        </div>
    </div>

    <!-- Download Success Support Modal -->
    <div v-if="showDownloadSuccessModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-[60]"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @click.self="showDownloadSuccessModal = false">
        <div class="rounded-2xl p-6 max-w-md w-full text-center"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style="background: rgba(var(--accent-rgb), 0.1); color: var(--accent);">
                <Icon name="lucide:arrow-down-to-line" class="h-6 w-6" :stroke-width="2.5" />
            </div>
            <h3 class="text-xl font-bold mb-1" style="color: var(--text-1);">{{ t('downloadComplete') }}</h3>
            <p class="text-sm mb-6" style="color: var(--text-3);">{{ t('supportPhotographers') }}</p>
            <div class="space-y-3 text-left max-h-60 overflow-y-auto pr-1 mb-6">
                <div v-for="photographer in downloadedPhotographers" :key="photographer.id"
                    class="p-3 rounded-xl flex items-center justify-between gap-3"
                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <img v-if="photographer.avatar" :src="photographer.avatar"
                            class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            style="border: 1px solid var(--separator);" />
                        <div v-else
                            class="w-10 h-10 rounded-full flex items-center justify-center text-accent-text font-bold text-sm flex-shrink-0"
                            style="background: var(--accent);">
                            {{ photographer.name?.charAt(0) || '?' }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-sm break-words" style="color: var(--text-1);">{{ photographer.name }}</p>
                            <p v-if="photographer.instagram" class="text-xs mt-0.5 break-words" style="color: var(--text-3);">@{{ photographer.instagram }}</p>
                        </div>
                    </div>
                    <a v-if="photographer.instagram"
                        :href="`https://instagram.com/${photographer.instagram}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="($event.currentTarget as HTMLElement).style.opacity = '0.9'"
                        @mouseout="($event.currentTarget as HTMLElement).style.opacity = '1'">
                        <Icon name="lucide:instagram" class="w-3.5 h-3.5" />
                        Follow
                    </a>
                </div>
            </div>
            <button @click="showDownloadSuccessModal = false"
                class="w-full py-2.5 rounded-xl font-medium transition"
                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                {{ t('done') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import JSZip from 'jszip'
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
    clearSelection()
    showDownloadSuccessModal.value = false
    downloadedPhotographers.value = []
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
const emit = defineEmits<{
    'results-change': [hasResults: boolean]
}>()

// ── Selection + download of matched photos ──────────────────────────────
const dialog = useDialog()
const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100 MB

// Reactive map so toggling one tile doesn't re-render every tile.
const selectedMap = reactive<Record<string, boolean>>({})
const selectedCount = computed(() => Object.keys(selectedMap).filter(k => selectedMap[k]).length)

const toggleSelect = (id: string) => {
    if (selectedMap[id]) {
        delete selectedMap[id]
    } else {
        selectedMap[id] = true
    }
}

const clearSelection = () => {
    Object.keys(selectedMap).forEach(k => delete selectedMap[k])
}

// Dedupe by id — the same photo can match several faces (appears multiple
// times in the flattened match list).
const selectedPhotos = computed<FaceSearchPhoto[]>(() => {
    const seen = new Set<string>()
    const result: FaceSearchPhoto[] = []
    for (const p of viewerPhotos.value) {
        if (selectedMap[p.id] && !seen.has(p.id)) {
            seen.add(p.id)
            result.push(p)
        }
    }
    return result
})

const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })
const downloadedPhotographers = ref<Array<{ id: string; name: string | null; instagram: string | null; avatar: string | null }>>([])
const showDownloadSuccessModal = ref(false)

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const showSupportPopup = (downloadedPhotos: FaceSearchPhoto[]) => {
    const map = new Map<string, NonNullable<FaceSearchPhoto['uploader']>>()
    downloadedPhotos.forEach(photo => {
        if (photo.uploader?.id && !map.has(photo.uploader.id)) {
            map.set(photo.uploader.id, photo.uploader)
        }
    })
    downloadedPhotographers.value = Array.from(map.values())
    if (downloadedPhotographers.value.length > 0) {
        showDownloadSuccessModal.value = true
    }
}

// Downloads the selected result photos as one or more zips (batched by size,
// same flow as the album/share-page download).
const downloadSelected = async () => {
    if (downloading.value || selectedCount.value === 0) return

    const photos = selectedPhotos.value
    if (photos.length === 0) return

    downloading.value = true
    downloadProgress.value = { current: 0, total: photos.length }

    try {
        const files: { blob: Blob; name: string }[] = []
        const downloaded: FaceSearchPhoto[] = []
        for (const photo of photos) {
            try {
                const res = await fetch(buildAssetUrl(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`))
                const blob = await res.blob()
                files.push({ blob, name: photo.originalName })
                downloaded.push(photo)
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        }

        if (files.length === 0) {
            downloading.value = false
            downloadProgress.value = { current: 0, total: 0 }
            return
        }

        // Batch zipping
        const batches: { blob: Blob; name: string }[][] = []
        let currentBatch: { blob: Blob; name: string }[] = []
        let currentBatchSize = 0
        for (const file of files) {
            if (currentBatchSize + file.blob.size > MAX_ZIP_SIZE && currentBatch.length > 0) {
                batches.push(currentBatch)
                currentBatch = []
                currentBatchSize = 0
            }
            currentBatch.push(file)
            currentBatchSize += file.blob.size
        }
        if (currentBatch.length > 0) {
            batches.push(currentBatch)
        }

        const folderName = 'face-search-results'
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]!
            const zip = new JSZip()
            const folder = zip.folder(folderName)
            batch.forEach(f => folder?.file(f.name, f.blob))
            const content = await zip.generateAsync({ type: 'blob' })
            const partSuffix = batches.length > 1 ? `-part${i + 1}` : ''
            downloadBlob(content, `${folderName}${partSuffix}.zip`)

            if (i < batches.length - 1) {
                await new Promise(r => setTimeout(r, 600))
            }
        }

        showSupportPopup(downloaded)
    } catch (err) {
        console.error('Failed to download selected photos', err)
        dialog.toast('Failed to download selected photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}
</script>
