<template>
    <div ref="viewerEl"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#030303] text-white"
        role="dialog" aria-modal="true" :aria-label="photo.originalName || photo.filename" tabindex="-1"
        @click.self="$emit('close')" style="touch-action: none;">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/85 via-black/35 to-transparent z-10" />
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/80 via-black/25 to-transparent z-10" />

        <!-- Mobile Top Action Bar -->
        <div
            class="md:hidden fixed top-0 left-0 right-0 px-4 pb-4 z-50 flex items-center justify-between gap-3"
            style="padding-top: max(0.75rem, env(safe-area-inset-top));">
            <button @click="$emit('close')" aria-label="Close viewer"
                class="glass-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-90">
                <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
            </button>
            <!-- Actions -->
            <div class="flex max-w-full gap-2">
                <button @click="showInfo = !showInfo" aria-label="Photo information" :aria-pressed="showInfo" :class="[
                    'glass-control w-11 h-11 flex items-center justify-center rounded-full text-white transition active:scale-90',
                    showInfo ? 'bg-white/20' : ''
                ]">
                    <Icon name="lucide:info" class="h-6 w-6" :stroke-width="2" />
                </button>
                <!-- iOS: Download button that triggers share sheet -->
                <button v-if="isIOS" @click="sharePhoto"
                    :disabled="isSharing"
                    aria-label="Download photo"
                    class="w-11 h-11 flex items-center justify-center rounded-full text-accent-text transition backdrop-blur-sm shadow-lg active:scale-90 disabled:opacity-50" style="background: var(--accent);">
                    <Icon v-if="!isSharing" name="lucide:download" class="h-6 w-6" :stroke-width="2" />
                    <Icon v-else name="lucide:loader-2" class="h-6 w-6 animate-spin" />
                </button>
                <!-- Android: Share + Download buttons -->
                <template v-else-if="isAndroid">
                    <button @click="sharePhoto"
                        :disabled="isSharing"
                        aria-label="Share photo"
                        class="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition backdrop-blur-sm active:scale-90 disabled:opacity-50">
                        <Icon v-if="!isSharing" name="lucide:share-2" class="h-6 w-6" :stroke-width="2" />
                        <Icon v-else name="lucide:loader-2" class="h-6 w-6 animate-spin" />
                    </button>
                    <button @click="downloadPhoto"
                        :disabled="isSharing"
                        aria-label="Download photo"
                        class="w-11 h-11 flex items-center justify-center rounded-full text-accent-text transition backdrop-blur-sm shadow-lg active:scale-90 disabled:opacity-50" style="background: var(--accent);">
                        <Icon v-if="!isSharing" name="lucide:download" class="h-6 w-6" :stroke-width="2" />
                        <Icon v-else name="lucide:loader-2" class="h-6 w-6 animate-spin" />
                    </button>
                </template>
                <!-- Desktop/Other: Download button only -->
                <button v-else @click="downloadPhoto"
                    :disabled="isSharing"
                    aria-label="Download photo"
                    class="w-11 h-11 flex items-center justify-center rounded-full text-accent-text transition backdrop-blur-sm shadow-lg active:scale-90 disabled:opacity-50" style="background: var(--accent);">
                    <Icon v-if="!isSharing" name="lucide:download" class="h-6 w-6" :stroke-width="2" />
                    <Icon v-else name="lucide:loader-2" class="h-6 w-6 animate-spin" />
                </button>
                <!-- Heart/Favorite button -->
                <button v-if="showFavorite" @click="$emit('toggleFavorite')" aria-label="Toggle favorite" :aria-pressed="isFavorited"
                    :class="[
                        'w-11 h-11 flex items-center justify-center rounded-full text-white transition backdrop-blur-sm active:scale-90',
                        isFavorited
                            ? 'favorite-btn-active'
                            : 'bg-white/10 hover:bg-white/20 active:bg-white/30'
                    ]">
                    <Icon v-if="isFavorited" name="lucide:heart" class="h-6 w-6 fill-current" :stroke-width="2" />
                    <Icon v-else name="lucide:heart" class="h-6 w-6" :stroke-width="2" />
                </button>
            </div>
        </div>

        <div class="flex flex-col md:flex-row w-full h-full mx-auto md:p-4 md:gap-4 relative z-20">
            <!-- Main Image Area -->
            <div ref="imageAreaEl" class="flex-1 flex items-center justify-center relative group overflow-hidden px-2 md:px-0 pt-20 pb-5 md:py-0"
                @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd"
                @wheel.prevent="handleWheel" @dblclick="toggleZoom" @mousedown="handlePanStart">

                <div class="hidden md:flex absolute top-4 left-4 right-4 items-start justify-between gap-4 z-30">
                    <div class="max-w-[min(44rem,52vw)] rounded-full bg-black/45 px-4 py-2 text-sm text-white/80 backdrop-blur-md opacity-0 shadow-lg shadow-black/20 transition group-hover:opacity-100">
                        <p class="text-xs text-white/50">Double-click or scroll to zoom</p>
                    </div>

                    <div class="flex gap-2">
                    <button @click.stop="toggleZoom" title="Zoom" aria-label="Zoom"
                        class="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/75 transition backdrop-blur-sm active:scale-90 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white">
                        <Icon :name="zoomLevel > 1 ? 'lucide:zoom-out' : 'lucide:zoom-in'" class="h-5 w-5" :stroke-width="2" />
                    </button>
                    <button v-if="zoomLevel > 1" @click.stop="resetZoom" title="Reset zoom" aria-label="Reset zoom"
                        class="h-10 min-w-14 px-3 flex items-center justify-center rounded-full bg-black/50 text-xs font-semibold text-white/75 transition backdrop-blur-sm active:scale-90 hover:bg-black/70 hover:text-white">
                        {{ Math.round(zoomLevel * 100) }}%
                    </button>
                    <button @click.stop="showInfo = !showInfo" title="Photo details" aria-label="Photo details" :aria-pressed="showInfo"
                        class="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/75 transition backdrop-blur-sm active:scale-90 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white">
                        <Icon name="lucide:info" class="h-5 w-5" :stroke-width="2" />
                    </button>
                    <button v-if="showFavorite" @click.stop="$emit('toggleFavorite')" @touchstart.stop @touchmove.stop.prevent
                        aria-label="Toggle favorite" :aria-pressed="isFavorited"
                        class="w-10 h-10 flex items-center justify-center rounded-full transition backdrop-blur-sm active:scale-90"
                        :class="isFavorited
                            ? 'favorite-solid opacity-100'
                            : 'bg-black/50 text-white/75 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white'">
                        <Icon v-if="isFavorited" name="lucide:heart" class="h-6 w-6 fill-current" :stroke-width="2" />
                        <Icon v-else name="lucide:heart" class="h-6 w-6" :stroke-width="2" />
                    </button>
                    <button v-if="canUseFaceOverlays" @click.stop="showFaces = !showFaces"
                        :title="showFaces ? 'Hide faces' : 'Show faces'"
                        :aria-label="showFaces ? 'Hide faces' : 'Show faces'" :aria-pressed="showFaces"
                        class="w-10 h-10 flex items-center justify-center rounded-full text-white/75 transition backdrop-blur-sm active:scale-90 hover:bg-black/70 hover:text-white"
                        :class="showFaces ? 'bg-white/20' : 'bg-black/50'">
                        <Icon name="lucide:scan-face" class="h-5 w-5" :stroke-width="2" />
                    </button>
                    <button @click.stop="isIOS ? sharePhoto() : downloadPhoto()" @touchstart.stop
                        @touchmove.stop.prevent
                        :disabled="isSharing"
                        title="Download" aria-label="Download photo"
                        class="w-10 h-10 flex items-center justify-center rounded-full text-accent-text transition shadow-lg active:scale-90 disabled:opacity-50" style="background: var(--accent);">
                        <Icon v-if="!isSharing" name="lucide:download" class="h-6 w-6" :stroke-width="2" />
                        <Icon v-else name="lucide:loader-2" class="h-6 w-6 animate-spin" />
                    </button>
                    <button @click.stop="$emit('close')" title="Close" aria-label="Close viewer"
                        class="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/75 transition backdrop-blur-sm active:scale-90 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white">
                        <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
                    </button>
                    </div>
                </div>

                <div v-if="isImageSwiping && imageSwipeOffset > 24 && hasPrevious"
                    class="pointer-events-none absolute left-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-xl transition">
                    <Icon name="lucide:chevron-left" class="h-5 w-5" :stroke-width="2.5" />
                </div>
                <div v-if="isImageSwiping && imageSwipeOffset < -24 && hasNext"
                    class="pointer-events-none absolute right-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-xl transition">
                    <Icon name="lucide:chevron-right" class="h-5 w-5" :stroke-width="2.5" />
                </div>

                <!-- Desktop Navigation Buttons -->
                <button v-if="hasPrevious" @click="$emit('previous')" aria-label="Previous photo"
                    class="hidden md:flex absolute left-4 w-12 h-12 items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm">
                    <Icon name="lucide:chevron-left" class="h-6 w-6" :stroke-width="2" />
                </button>

                <button v-if="hasNext" @click="$emit('next')" aria-label="Next photo"
                    class="hidden md:flex absolute right-4 w-12 h-12 items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm">
                    <Icon name="lucide:chevron-right" class="h-6 w-6" :stroke-width="2" />
                </button>

                <div class="relative w-full h-full select-none" :style="imageContainerStyle">
                    <div class="absolute inset-y-0 flex" :style="carouselTrackStyle">
                        <div class="flex h-full w-1/3 shrink-0 items-center justify-center px-2 md:px-0">
                            <img v-if="previousImageSrc" :src="previousImageSrc" alt="" aria-hidden="true"
                                class="max-h-full max-w-full rounded-md object-contain opacity-90 shadow-2xl md:rounded-lg" draggable="false" />
                        </div>

                        <div ref="currentImageStageEl" class="relative flex h-full w-1/3 shrink-0 items-center justify-center px-2 md:px-0">
                    <!-- Loading Spinner -->
                    <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center z-20">
                        <div class="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white">
                        </div>
                    </div>

                    <img ref="mainImageEl" :key="currentImageSrc" :src="currentImageSrc" :alt="photo.filename" @load="onImageLoad" @error="onImageError"
                        decoding="async" fetchpriority="high"
                        class="relative max-h-full max-w-full object-contain rounded-md md:rounded-lg shadow-2xl z-10 transition-opacity duration-200"
                        :class="[imageLoading ? 'opacity-0' : 'opacity-100', zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in']"
                        :style="imageStyle"
                        draggable="false" />
                        <div v-if="canShowFaceOverlays && faceOverlayStyle" class="absolute z-20 pointer-events-none"
                            :style="faceOverlayStyle">
                            <div v-for="face in faces" :key="face.id"
                                class="absolute pointer-events-auto" :style="faceBoxStyle(face)"
                                @mousedown.stop>
                                <button v-if="face.personId && face.personName"
                                    @click.stop="navigateToPerson(face.personId)"
                                    :aria-label="`Open ${face.personName}`" :title="face.personName"
                                    class="absolute inset-0 rounded-[3px] border-2 transition hover:bg-white/15"
                                    style="border-color: rgba(255,255,255,0.85);"></button>
                                <div v-else class="absolute inset-0 rounded-[3px] border-2"
                                    style="border-color: rgba(255,255,255,0.55);"></div>
                                <button v-if="face.personId && face.personName"
                                    @click.stop="navigateToPerson(face.personId)" @mousedown.stop
                                    class="absolute -bottom-7 left-0 max-w-[180px] flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                                    style="background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);">
                                    <span class="truncate">{{ face.personName }}</span>
                                </button>
                            </div>
                        </div>
                        </div>

                        <div class="flex h-full w-1/3 shrink-0 items-center justify-center px-2 md:px-0">
                            <img v-if="nextImageSrc" :src="nextImageSrc" alt="" aria-hidden="true"
                                class="max-h-full max-w-full rounded-md object-contain opacity-90 shadow-2xl md:rounded-lg" draggable="false" />
                        </div>
                    </div>
                </div>

                <div class="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-3 rounded-full bg-black/45 px-4 py-2 text-xs text-white/60 opacity-0 shadow-lg shadow-black/20 backdrop-blur-md transition group-hover:opacity-100">
                    <span>Esc</span>
                    <span class="text-white/25">Close</span>
                    <span class="h-3 w-px bg-white/20"></span>
                    <span>← →</span>
                    <span class="text-white/25">Navigate</span>
                </div>

                <!-- Mobile Zoom Controls -->
                <div v-if="!showInfo"
                    class="md:hidden absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/45 p-1 shadow-lg shadow-black/20 backdrop-blur-xl">
                    <button @click.stop="toggleZoom" aria-label="Zoom" class="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition active:scale-90 active:bg-white/15">
                        <Icon :name="zoomLevel > minZoom ? 'lucide:zoom-out' : 'lucide:zoom-in'" class="h-5 w-5" :stroke-width="2" />
                    </button>
                    <button v-if="zoomLevel > minZoom" @click.stop="resetZoom" aria-label="Reset zoom"
                        class="flex h-10 min-w-14 items-center justify-center rounded-full bg-white/10 px-3 text-xs font-semibold text-white/80 transition active:scale-90 active:bg-white/20">
                        {{ Math.round(zoomLevel * 100) }}%
                    </button>
                </div>
            </div>

            <!-- Mobile Backdrop (when info is open) -->
            <div v-if="showInfo" @click="showInfo = false" class="md:hidden fixed inset-0 bg-black/50 z-30"></div>

            <!-- Info Sidebar (Desktop) / Bottom Sheet (Mobile) -->
            <div :class="[
                'overflow-x-hidden overflow-y-auto',
                // Mobile: Bottom sheet
                'fixed bottom-0 left-0 right-0 rounded-t-3xl border-t md:border-l md:border-t-0',
                'max-h-[70vh] md:max-h-none',
                // Desktop: Side panel
                'md:static md:rounded-r-xl md:rounded-t-none md:transition-all md:duration-300 md:ease-out',
                showInfo ? 'md:w-80 md:opacity-100' : 'md:w-0 md:opacity-0 md:pointer-events-none md:border-l-0',
                'z-40',
                !isSwiping && 'transition-transform duration-300'
            ]" :style="[mobileTransformStyle, { background: '#111112', borderColor: 'rgba(255,255,255,0.08)' }]"
                @touchstart="handleInfoTouchStart" @touchmove="handleInfoTouchMove"
                @touchend="handleInfoTouchEnd">
                <!-- Mobile: Drag Handle -->
                <div class="md:hidden flex justify-center pt-2 pb-4" @touchstart.stop="handleInfoTouchStart"
                    @touchmove.stop="handleInfoTouchMove" @touchend.stop="handleInfoTouchEnd">
                    <div class="w-12 h-1.5 bg-white/30 rounded-full"></div>
                </div>

                <div class="px-6 pb-6 md:pt-6">
                    <div class="flex items-center justify-start gap-4 mb-6">
                        <button @click="$emit('close')"
                            class="hidden md:flex p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition shrink-0">
                            <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
                        </button>
                        <h3 class="text-left text-2xl font-bold text-white line-clamp-2">
                            Photo Details</h3>
                    </div>

                    <!-- Uploader Info -->
                    <div class="mb-6">
                        <h4 class="text-sm font-medium text-white/50 mb-2">Uploaded By</h4>
                        <div class="flex items-center space-x-3">
                            <img v-if="photo.uploader?.avatar" :src="photo.uploader.avatar"
                                class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                style="border: 1px solid rgba(255,255,255,0.15);" />
                            <div v-else
                                class="w-10 h-10 rounded-full flex items-center justify-center text-accent-text font-bold text-sm flex-shrink-0"
                                style="background: var(--accent);">
                                {{ photo.uploader?.name?.charAt(0) || '?' }}
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <p class="text-white font-medium">{{ photo.uploader?.name || 'Unknown' }}</p>
                                    <a v-if="photo.uploader?.instagram"
                                        :href="getInstagramUrl(photo.uploader.instagram)" target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-white/60 hover:text-white transition">
                                        <Icon name="lucide:instagram" class="w-4 h-4" />
                                    </a>
                                </div>
                                <p class="text-xs text-white/50">{{ formatDate(photo.createdAt) }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- EXIF Data -->
                    <div class="space-y-4" v-if="showMetadata">
                        <h4 class="text-sm font-medium text-white/50 border-b border-white/10 pb-2">Camera Info</h4>

                        <div v-if="photo.cameraModel" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('camera') }}</span>
                            <span class="text-white md:text-right">{{ photo.cameraModel }}</span>
                        </div>

                        <div v-if="photo.lens" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('lens') }}</span>
                            <span class="text-white md:text-right">{{ photo.lens }}</span>
                        </div>

                        <div v-if="photo.focalLength" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('focalLength') }}</span>
                            <span class="text-white md:text-right">{{ photo.focalLength }}</span>
                        </div>

                        <div v-if="photo.aperture" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('aperture') }}</span>
                            <span class="text-white md:text-right">{{ photo.aperture }}</span>
                        </div>

                        <div v-if="photo.shutterSpeed"
                            class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('shutter') }}</span>
                            <span class="text-white md:text-right">{{ photo.shutterSpeed }}</span>
                        </div>

                        <div v-if="photo.iso" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('iso') }}</span>
                            <span class="text-white md:text-right">{{ photo.iso }}</span>
                        </div>

                        <div v-if="photo.dateTaken" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">{{ t('takenOn') }}</span>
                            <span class="text-white md:text-right">{{ formatDate(photo.dateTaken) }}</span>
                        </div>
                    </div>

                    <!-- File Info -->
                    <div class="mt-8 pt-6 border-t border-white/10 space-y-2" v-if="showMetadata">
                        <div class="flex justify-between md:grid md:grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">{{ t('filename') }}</span>
                            <span class="text-white md:text-right truncate" :title="photo.originalName">{{
                                photo.originalName }}</span>
                        </div>
                        <div class="flex justify-between md:grid md:grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">{{ t('size') }}</span>
                            <span class="text-white md:text-right">{{ formatSize(photo.size) }}</span>
                        </div>
                        <div v-if="photo.width && photo.height" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">{{ t('dimensions') }}</span>
                            <span class="text-white md:text-right">{{ photo.width }} × {{ photo.height }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Share-ready popup (iOS slow connection) -->
        <Transition name="fade">
            <div v-if="shareTimedOut"
                class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md"
                style="background: rgba(30,30,30,0.92); border: 1px solid rgba(255,255,255,0.12);">
                <template v-if="pendingShareFile">
                    <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0" style="color: var(--accent);" :stroke-width="2" />
                    <span class="text-sm text-white font-medium">{{ t('photoReady') }}</span>
                    <button @click="retryShare"
                        class="text-sm font-semibold px-3 py-1 rounded-xl transition active:scale-95"
                        style="background: var(--accent); color: var(--accent-text);">
                        {{ t('tapToShare') }}
                    </button>
                </template>
                <template v-else>
                    <Icon name="lucide:loader-2" class="h-5 w-5 flex-shrink-0 animate-spin text-white/60" />
                    <span class="text-sm text-white/80">{{ t('slowConnection') }}</span>
                </template>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts">
const viewerPreloadCache = new Map<string, HTMLImageElement>()
const viewerLoadedImageKeys = new Set<string>()
</script>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'
import { t, initLanguage } from '~/utils/i18n'
import { getAuthToken } from '~/utils/auth-client'

interface Photo {
    id: string

    filename: string
    originalName: string
    size: number
    createdAt: number
    uploader: {
        name: string | null
        instagram?: string | null
        avatar?: string | null
    } | null
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
    dateTaken?: number | null
    blurhash?: string | null
    width?: number | null
    height?: number | null
    updatedAt?: number | null
}

const props = withDefaults(defineProps<{
    photo: Photo
    hasPrevious: boolean
    hasNext: boolean
    previousPhotoId?: string | null
    nextPhotoId?: string | null
    previousPhotoTimestamp?: number | string | null
    nextPhotoTimestamp?: number | string | null
    showMetadata?: boolean
    showFavorite?: boolean
    isFavorited?: boolean
}>(), {
    showMetadata: true,
    showFavorite: false,
    isFavorited: false
})

const emit = defineEmits(['close', 'previous', 'next', 'toggleFavorite'])

onMounted(() => {
    initLanguage()
})

const showInfo = ref(false)
const imageLoading = ref(true)
const isSharing = ref(false)
const shareTimedOut = ref(false)
const pendingShareFile = ref<File | null>(null)
const viewerEl = ref<HTMLElement | null>(null)
const imageAreaEl = ref<HTMLElement | null>(null)
const currentImageStageEl = ref<HTMLElement | null>(null)
const mainImageEl = ref<HTMLImageElement | null>(null)
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const isTouchPanning = ref(false)
const isPinching = ref(false)
const panStartX = ref(0)
const panStartY = ref(0)
const panOriginX = ref(0)
const panOriginY = ref(0)
let shareTimeoutId: ReturnType<typeof setTimeout> | null = null
const failedImageKeys = new Set<string>()
const minZoom = 1
const maxZoom = 4

interface FaceOverlay {
    id: string
    x1: number
    y1: number
    x2: number
    y2: number
    score?: number
    personId?: string | null
    personName?: string | null
}

const isAuthenticated = () => !!getAuthToken()
const isDesktop = ref(false)
const facesAvailable = ref(false)
const showFaces = ref(false)
const faces = ref<FaceOverlay[]>([])
const faceOverlayRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)
let facesAbortController: AbortController | null = null
let faceResizeObserver: ResizeObserver | null = null
let hasMountedFaceSupport = false
let desktopSyncListener: (() => void) | null = null

const canUseFaceOverlays = computed(() => isAuthenticated() && isDesktop.value && facesAvailable.value)
const canShowFaceOverlays = computed(() => canUseFaceOverlays.value && showFaces.value && zoomLevel.value <= 1)

const faceOverlayStyle = computed(() => {
    const rect = faceOverlayRect.value
    if (!rect) return null
    return {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
    }
})

const faceBoxStyle = (face: FaceOverlay) => {
    const rect = faceOverlayRect.value
    if (!rect) return null
    return {
        left: `${face.x1 * 100}%`,
        top: `${face.y1 * 100}%`,
        width: `${Math.max(0, face.x2 - face.x1) * 100}%`,
        height: `${Math.max(0, face.y2 - face.y1) * 100}%`
    }
}

function updateFaceOverlayGeometry() {
    if (!hasMountedFaceSupport) return
    const img = mainImageEl.value
    const stage = currentImageStageEl.value
    if (!img || !stage) {
        faceOverlayRect.value = null
        return
    }
    const imgRect = img.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    if (imgRect.width <= 0 || imgRect.height <= 0) {
        faceOverlayRect.value = null
        return
    }
    faceOverlayRect.value = {
        left: imgRect.left - stageRect.left,
        top: imgRect.top - stageRect.top,
        width: imgRect.width,
        height: imgRect.height
    }
}

async function fetchFaces() {
    facesAvailable.value = false
    showFaces.value = false
    faces.value = []
    faceOverlayRect.value = null
    if (!isAuthenticated()) return

    facesAbortController?.abort()
    const controller = new AbortController()
    facesAbortController = controller
    try {
        const res = await $fetch<{ success: boolean; data: FaceOverlay[] }>(`/api/v1/photos/${props.photo.id}/faces`, {
            signal: controller.signal
        })
        if (controller.signal.aborted) return
        faces.value = Array.isArray(res?.data) ? res.data : []
        facesAvailable.value = faces.value.length > 0
        updateFaceOverlayGeometry()
    } catch {
        // Face overlays are optional; public viewers and offline states simply hide them.
    } finally {
        if (facesAbortController === controller) facesAbortController = null
    }
}

function navigateToPerson(personId: string) {
    if (!personId) return
    navigateTo(`/people/${personId}`)
}

const getPhotoCacheKey = (photoId: string, timestamp: number | string | null | undefined) => `${photoId}:${timestamp || ''}`
const buildFullImageSrc = (photoId: string, timestamp: number | string | null | undefined) => {
    return buildAssetUrl(`/api/assets/full/${photoId}?t=${timestamp || ''}`)
}

const currentImageKey = computed(() => getPhotoCacheKey(props.photo.id, props.photo.updatedAt || props.photo.createdAt || ''))
const fullImageSrc = computed(() => buildFullImageSrc(props.photo.id, props.photo.updatedAt || props.photo.createdAt || ''))
const previousImageSrc = computed(() => !shouldAvoidFullPreload() && props.previousPhotoId
    ? buildFullImageSrc(props.previousPhotoId, props.previousPhotoTimestamp)
    : null)
const nextImageSrc = computed(() => !shouldAvoidFullPreload() && props.nextPhotoId
    ? buildFullImageSrc(props.nextPhotoId, props.nextPhotoTimestamp)
    : null)
const currentImageSrc = ref(fullImageSrc.value)

// Platform detection
const isIOS = computed(() => {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
})

const isAndroid = computed(() => {
    if (typeof window === 'undefined') return false
    return /Android/.test(navigator.userAgent)
})

// Image loading handler
const onImageLoad = () => {
    viewerLoadedImageKeys.add(currentImageKey.value)
    imageLoading.value = false
    updateFaceOverlayGeometry()
}

const onImageError = () => {
    const timestamp = String(props.photo.updatedAt || props.photo.createdAt || '')
    const imageKey = getPhotoCacheKey(props.photo.id, timestamp)

    if (!failedImageKeys.has(imageKey)) {
        failedImageKeys.add(imageKey)
        currentImageSrc.value = `${buildFullImageSrc(props.photo.id, timestamp)}&retry=${Date.now()}`
        return
    }

    imageLoading.value = false
}

// Watch for photo changes to reset loading state and preload adjacent images
const watchedPhoto = computed(() => ({
    id: props.photo.id,
    timestamp: props.photo.updatedAt || props.photo.createdAt || '',
}))

watch(watchedPhoto, async (current, previous) => {
    if (previous && current.id === previous.id && current.timestamp === previous.timestamp) {
        return
    }

    const imageKey = getPhotoCacheKey(current.id, current.timestamp)
    imageLoading.value = !viewerLoadedImageKeys.has(imageKey)
    currentImageSrc.value = buildFullImageSrc(current.id, current.timestamp)
    resetZoom()

    // Preload adjacent images
    nextTick(() => {
        if (!shouldAvoidFullPreload() && props.previousPhotoId) {
            preloadImage(props.previousPhotoId)
        }
        if (!shouldAvoidFullPreload() && props.nextPhotoId) {
            preloadImage(props.nextPhotoId)
        }
        fetchFaces()
        updateFaceOverlayGeometry()
    })
}, { immediate: true })

watch(zoomLevel, (next, previous) => {
    if (next <= 1 && previous > 1) {
        window.setTimeout(updateFaceOverlayGeometry, 220)
    } else {
        updateFaceOverlayGeometry()
    }
})

watch(showFaces, () => {
    if (showFaces.value) {
        nextTick(updateFaceOverlayGeometry)
    }
})

// Preload image function
const preloadImage = (photoId: string) => {
    const timestamp = photoId === props.previousPhotoId ? props.previousPhotoTimestamp : props.nextPhotoTimestamp
    const key = getPhotoCacheKey(photoId, timestamp)
    if (viewerPreloadCache.has(key) || viewerLoadedImageKeys.has(key)) return

    const image = new Image()
    image.decoding = 'async'
    image.setAttribute('fetchpriority', 'low')
    image.onload = () => viewerLoadedImageKeys.add(key)
    image.onerror = () => viewerPreloadCache.delete(key)
    viewerPreloadCache.set(key, image)
    image.src = buildFullImageSrc(photoId, timestamp)
}

const shouldAvoidFullPreload = () => {
    if (typeof navigator === 'undefined') return true
    const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
    }).connection

    return !!connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g'
}

// Prevent body scroll when viewer is open
onMounted(() => {
    document.body.style.overflow = 'hidden'
    nextTick(() => viewerEl.value?.focus())
    hasMountedFaceSupport = true
    isDesktop.value = window.innerWidth >= 768
    desktopSyncListener = () => {
        isDesktop.value = window.innerWidth >= 768
        if (isDesktop.value) updateFaceOverlayGeometry()
    }
    window.addEventListener('resize', desktopSyncListener)
    faceResizeObserver = new ResizeObserver(() => updateFaceOverlayGeometry())
    if (imageAreaEl.value) faceResizeObserver.observe(imageAreaEl.value)
    nextTick(() => {
        fetchFaces()
        updateFaceOverlayGeometry()
    })
})

onUnmounted(() => {
    failedImageKeys.clear()
    document.body.style.overflow = ''
    removePanListeners()
    facesAbortController?.abort()
    facesAbortController = null
    faceResizeObserver?.disconnect()
    faceResizeObserver = null
    if (desktopSyncListener) {
        window.removeEventListener('resize', desktopSyncListener)
        desktopSyncListener = null
    }
})

// Computed style for mobile transform (desktop should not have transform)
const mobileTransformStyle = computed(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) {
        return {} // No transform on desktop
    }
    return {
        transform: showInfo.value ? (isSwiping.value ? `translateY(${swipeOffset.value}px)` : 'translateY(0)') : 'translateY(100%)'
    }
})

// Image container style for swipe feedback
const imageContainerStyle = computed(() => {
    const vertical = gestureAxis.value === 'vertical' ? Math.max(0, imageSwipeOffsetY.value) : 0
    const progress = Math.min(vertical / 360, 1)
    return {
        transform: `translate3d(0, ${vertical}px, 0) scale(${1 - progress * 0.08})`,
        opacity: 1 - progress * 0.45,
        transition: isImageSwiping.value ? 'none' : 'transform 280ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease'
    }
})

const carouselTrackStyle = computed(() => ({
    width: '300%',
    left: '-100%',
    transform: `translate3d(${imageSwipeOffset.value}px, 0, 0)`,
    transition: isCarouselSettling.value ? 'transform 240ms cubic-bezier(.22,.75,.25,1)' : 'none',
    willChange: gestureAxis.value === 'horizontal' ? 'transform' : 'auto'
}))

const imageStyle = computed(() => ({
    transform: `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoomLevel.value})`,
    transition: isPanning.value || isTouchPanning.value || isPinching.value ? 'none' : 'transform 180ms ease-out, opacity 200ms ease',
    transformOrigin: 'center center'
}))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const setZoom = (nextZoom: number) => {
    zoomLevel.value = clamp(nextZoom, minZoom, maxZoom)
    if (zoomLevel.value === minZoom) {
        panX.value = 0
        panY.value = 0
    } else {
        panX.value = clamp(panX.value, -window.innerWidth * 0.45, window.innerWidth * 0.45)
        panY.value = clamp(panY.value, -window.innerHeight * 0.45, window.innerHeight * 0.45)
    }
}

const setZoomAtPoint = (nextZoom: number, clientX: number, clientY: number) => {
    const imageArea = imageAreaEl.value
    if (!imageArea) {
        setZoom(nextZoom)
        return
    }

    const previousZoom = zoomLevel.value
    const clampedZoom = clamp(nextZoom, minZoom, maxZoom)
    const zoomRatio = clampedZoom / previousZoom
    const bounds = imageArea.getBoundingClientRect()
    const pointerX = clientX - (bounds.left + bounds.width / 2)
    const pointerY = clientY - (bounds.top + bounds.height / 2)

    zoomLevel.value = clampedZoom
    panX.value = pointerX - (pointerX - panX.value) * zoomRatio
    panY.value = pointerY - (pointerY - panY.value) * zoomRatio
}

const toggleZoom = (e?: MouseEvent) => {
    if (zoomLevel.value > minZoom) {
        resetZoom()
        return
    }

    if (e?.currentTarget === imageAreaEl.value) {
        setZoomAtPoint(2.25, e.clientX, e.clientY)
    } else {
        setZoom(2.25)
    }
}

function resetZoom() {
    zoomLevel.value = minZoom
    panX.value = 0
    panY.value = 0
    isPanning.value = false
    isTouchPanning.value = false
    isPinching.value = false
}

const handleWheel = (e: WheelEvent) => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return
    const step = e.deltaY > 0 ? -0.18 : 0.18
    setZoom(zoomLevel.value + step)
}

const handlePanStart = (e: MouseEvent) => {
    if (e.button !== 0 || isCarouselSettling.value) return
    e.preventDefault()
    if (zoomLevel.value === minZoom) {
        isMouseCarouselDragging.value = true
        isImageSwiping.value = true
        gestureAxis.value = 'horizontal'
        touchStartX.value = e.clientX
        touchEndX.value = e.clientX
        touchStartTime.value = performance.now()
        window.addEventListener('mousemove', handlePanMove)
        window.addEventListener('mouseup', handlePanEnd)
        return
    }

    isPanning.value = true
    panStartX.value = e.clientX
    panStartY.value = e.clientY
    panOriginX.value = panX.value
    panOriginY.value = panY.value
    window.addEventListener('mousemove', handlePanMove)
    window.addEventListener('mouseup', handlePanEnd)
}

const handlePanMove = (e: MouseEvent) => {
    if (isMouseCarouselDragging.value) {
        touchEndX.value = e.clientX
        const deltaX = touchEndX.value - touchStartX.value
        imageSwipeOffset.value = ((deltaX > 0 && !props.hasPrevious) || (deltaX < 0 && !props.hasNext))
            ? deltaX * 0.3
            : deltaX
        return
    }
    if (!isPanning.value) return
    const maxPanX = window.innerWidth * 0.45
    const maxPanY = window.innerHeight * 0.45
    panX.value = clamp(panOriginX.value + e.clientX - panStartX.value, -maxPanX, maxPanX)
    panY.value = clamp(panOriginY.value + e.clientY - panStartY.value, -maxPanY, maxPanY)
}

const handlePanEnd = () => {
    if (isMouseCarouselDragging.value) {
        const deltaX = touchEndX.value - touchStartX.value
        const velocityX = deltaX / Math.max(performance.now() - touchStartTime.value, 1)
        isMouseCarouselDragging.value = false
        finishHorizontalCarouselGesture(deltaX, velocityX)
        removePanListeners()
        return
    }
    isPanning.value = false
    removePanListeners()
}

const removePanListeners = () => {
    if (typeof window === 'undefined') return
    window.removeEventListener('mousemove', handlePanMove)
    window.removeEventListener('mouseup', handlePanEnd)
}

// Touch/Swipe handling for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)
const touchStartY = ref(0)
const touchEndY = ref(0)
const minSwipeDistance = 50 // minimum distance for a swipe
const imageSwipeOffset = ref(0)
const imageSwipeOffsetY = ref(0)
const isImageSwiping = ref(false)
const isCarouselSettling = ref(false)
const isMouseCarouselDragging = ref(false)
const touchStartTime = ref(0)
const gestureAxis = ref<'pending' | 'horizontal' | 'vertical'>('pending')
const pinchStartDistance = ref(0)
const pinchStartZoom = ref(1)

const getTouchDistance = (first: Touch, second: Touch) => {
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

const resetTouchGesture = () => {
    touchStartX.value = 0
    touchEndX.value = 0
    touchStartY.value = 0
    touchEndY.value = 0
    imageSwipeOffset.value = 0
    imageSwipeOffsetY.value = 0
    isImageSwiping.value = false
    isCarouselSettling.value = false
    isMouseCarouselDragging.value = false
    gestureAxis.value = 'pending'
    isTouchPanning.value = false
    isPinching.value = false
    pinchStartDistance.value = 0
}

const snapCarouselBack = () => {
    isCarouselSettling.value = true
    isImageSwiping.value = false
    imageSwipeOffset.value = 0
    window.setTimeout(resetTouchGesture, 240)
}

const finishHorizontalCarouselGesture = (deltaX: number, velocityX: number) => {
    const commits = Math.abs(deltaX) > minSwipeDistance || Math.abs(velocityX) > 0.45
    const direction = deltaX < 0 ? 'next' : 'previous'
    const canNavigate = direction === 'next' ? props.hasNext : props.hasPrevious

    if (!commits || !canNavigate) {
        snapCarouselBack()
        return
    }

    isCarouselSettling.value = true
    isImageSwiping.value = false
    const pageWidth = imageAreaEl.value?.clientWidth || window.innerWidth
    imageSwipeOffset.value = direction === 'next' ? -pageWidth : pageWidth
    window.setTimeout(() => {
        emit(direction)
        resetTouchGesture()
    }, 240)
}

const handleTouchStart = (e: TouchEvent) => {
    if (isCarouselSettling.value) return
    if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
        pinchStartDistance.value = getTouchDistance(e.touches[0], e.touches[1])
        pinchStartZoom.value = zoomLevel.value
        isPinching.value = true
        isTouchPanning.value = false
        isImageSwiping.value = false
        return
    }

    if (!e.touches[0]) return

    if (zoomLevel.value > minZoom) {
        panStartX.value = e.touches[0].clientX
        panStartY.value = e.touches[0].clientY
        panOriginX.value = panX.value
        panOriginY.value = panY.value
        isTouchPanning.value = true
        return
    }

    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
    touchEndX.value = e.touches[0].clientX
    touchEndY.value = e.touches[0].clientY
    touchStartTime.value = performance.now()
    gestureAxis.value = 'pending'
    isImageSwiping.value = false
}

const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && e.touches[0] && e.touches[1] && pinchStartDistance.value > 0) {
        if (e.cancelable) e.preventDefault()
        isPinching.value = true
        setZoom(pinchStartZoom.value * (getTouchDistance(e.touches[0], e.touches[1]) / pinchStartDistance.value))
        return
    }

    if (!e.touches[0]) return

    if (zoomLevel.value > minZoom && isTouchPanning.value) {
        if (e.cancelable) e.preventDefault()
        const maxPanX = window.innerWidth * 0.45
        const maxPanY = window.innerHeight * 0.45
        panX.value = clamp(panOriginX.value + e.touches[0].clientX - panStartX.value, -maxPanX, maxPanX)
        panY.value = clamp(panOriginY.value + e.touches[0].clientY - panStartY.value, -maxPanY, maxPanY)
        return
    }

    touchEndX.value = e.touches[0].clientX
    touchEndY.value = e.touches[0].clientY

    const deltaX = touchEndX.value - touchStartX.value
    const deltaY = touchEndY.value - touchStartY.value

    if (gestureAxis.value === 'pending' && Math.hypot(deltaX, deltaY) > 8) {
        gestureAxis.value = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? 'horizontal' : 'vertical'
    }

    if (gestureAxis.value === 'horizontal') {
        isImageSwiping.value = true
        // Prevent default browser behavior (like swipe-to-navigate back/forward in Safari)
        if (e.cancelable) {
            e.preventDefault()
        }
        // Add resistance at boundaries
        if ((deltaX > 0 && !props.hasPrevious) || (deltaX < 0 && !props.hasNext)) {
            imageSwipeOffset.value = deltaX * 0.3 // 30% resistance at boundaries
        } else {
            imageSwipeOffset.value = deltaX
        }
    } else if (gestureAxis.value === 'vertical') {
        if (e.cancelable) e.preventDefault()
        isImageSwiping.value = true
        // Down dismisses; upward movement gets firm resistance instead of closing.
        imageSwipeOffsetY.value = deltaY > 0 ? deltaY : deltaY * 0.12
    }
}

const handleTouchEnd = (e: TouchEvent) => {
    if (isCarouselSettling.value) return
    if (isPinching.value || isTouchPanning.value || zoomLevel.value > minZoom) {
        const remainingTouch = e.touches[0]
        resetTouchGesture()

        if (remainingTouch && zoomLevel.value > minZoom) {
            panStartX.value = remainingTouch.clientX
            panStartY.value = remainingTouch.clientY
            panOriginX.value = panX.value
            panOriginY.value = panY.value
            isTouchPanning.value = true
        }
        return
    }

    const deltaX = touchEndX.value - touchStartX.value
    const deltaY = touchEndY.value - touchStartY.value
    const elapsed = Math.max(performance.now() - touchStartTime.value, 1)
    const velocityX = deltaX / elapsed
    const velocityY = deltaY / elapsed

    if (gestureAxis.value === 'horizontal') {
        finishHorizontalCarouselGesture(deltaX, velocityX)
        return
    } else if (gestureAxis.value === 'vertical' && deltaY > 90 && (deltaY > 140 || velocityY > 0.5)) {
        // Only a deliberate downward gesture dismisses the viewer.
        emit('close')
    }

    // Snap incomplete gestures back into place.
    snapCarouselBack()
}

// Info panel touch/swipe handling for dismiss
const infoTouchStartY = ref(0)
const infoTouchEndY = ref(0)
const swipeOffset = ref(0)
const isSwiping = ref(false)
const minSwipeDownDistance = 80 // minimum distance for swipe down to dismiss

const handleInfoTouchStart = (e: TouchEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return
    if (!e.touches[0]) return
    infoTouchStartY.value = e.touches[0].clientY
    isSwiping.value = true
}

const handleInfoTouchMove = (e: TouchEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return
    if (!isSwiping.value || !e.touches[0]) return

    infoTouchEndY.value = e.touches[0].clientY
    const deltaY = infoTouchEndY.value - infoTouchStartY.value

    // Only allow downward movement (deltaY > 0)
    if (deltaY > 0) {
        swipeOffset.value = deltaY
        // Prevent page scroll while swiping the panel
        if (e.cancelable) {
            e.preventDefault()
        }
    }
}

const handleInfoTouchEnd = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return
    if (!isSwiping.value) return
    const deltaY = infoTouchEndY.value - infoTouchStartY.value

    // If swiping down and past threshold, dismiss the info panel
    if (deltaY > minSwipeDownDistance) {
        showInfo.value = false
    }

    // Reset values
    infoTouchStartY.value = 0
    infoTouchEndY.value = 0
    swipeOffset.value = 0
    isSwiping.value = false
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Keyboard navigation
onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    resetShareState()
    window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        emit('close')
    } else if (e.key === 'ArrowLeft' && props.hasPrevious) {
        emit('previous')
    } else if (e.key === 'ArrowRight' && props.hasNext) {
        emit('next')
    } else if (e.key === 'i' || e.key === 'I') {
        showInfo.value = !showInfo.value
    } else if (e.key === '+' || e.key === '=') {
        setZoom(zoomLevel.value + 0.5)
    } else if (e.key === '-') {
        setZoom(zoomLevel.value - 0.5)
    } else if (e.key === '0') {
        resetZoom()
    }
}

const getInstagramUrl = (instagram: string | null) => {
    if (!instagram) return ''
    // Remove @ if present
    const username = instagram.startsWith('@') ? instagram.slice(1) : instagram
    return `https://instagram.com/${username}`
}

const resetShareState = () => {
    isSharing.value = false
    shareTimedOut.value = false
    pendingShareFile.value = null
    if (shareTimeoutId !== null) {
        clearTimeout(shareTimeoutId)
        shareTimeoutId = null
    }
}

const sharePhoto = async () => {
    if (isSharing.value) return
    isSharing.value = true
    shareTimedOut.value = false
    pendingShareFile.value = null

    // After 1.5s with no result, show the retry popup
    shareTimeoutId = setTimeout(() => {
        if (isSharing.value) shareTimedOut.value = true
    }, 1500)

    try {
        const timestamp = props.photo.updatedAt || props.photo.createdAt || ''
        const response = await fetch(buildAssetUrl(`/api/assets/full/${props.photo.id}?t=${timestamp}`))
        const blob = await response.blob()
        const file = new File([blob], props.photo.originalName, { type: blob.type })

        // Clear the timeout as soon as the file is loaded and we are about to share.
        // This prevents the slow connection tracker from firing while the native share sheet is open.
        if (shareTimeoutId !== null) {
            clearTimeout(shareTimeoutId)
            shareTimeoutId = null
        }

        if (shareTimedOut.value) {
            // Gesture window has expired — cache the file and let the popup button handle it
            pendingShareFile.value = file
            return
        }

        // Gesture still fresh — share directly
        if (navigator.share) {
            const shareStart = Date.now()
            try {
                await navigator.share({ files: [file], title: props.photo.originalName })
            } catch (shareErr: any) {
                const duration = Date.now() - shareStart
                // If it's a real AbortError (user cancelled), duration will be longer (human reaction time).
                // If the browser blocked it immediately, duration will be very short (< 250ms).
                if (shareErr.name === 'AbortError' && duration > 250) {
                    resetShareState()
                    return
                }
                // Gesture may have expired mid-flight — show popup so user can retry
                pendingShareFile.value = file
                shareTimedOut.value = true
                return
            }
        }
        resetShareState()
    } catch (err) {
        console.error('Share failed:', err)
        resetShareState()
    } finally {
        if (shareTimeoutId !== null) {
            clearTimeout(shareTimeoutId)
            shareTimeoutId = null
        }
        // Only clear isSharing if we're not waiting for a popup tap
        if (!shareTimedOut.value) isSharing.value = false
    }
}

const retryShare = async () => {
    const file = pendingShareFile.value
    if (!file || !navigator.share) return
    try {
        await navigator.share({ files: [file], title: props.photo.originalName })
    } catch (shareErr: any) {
        if (shareErr.name !== 'AbortError') console.error('Share failed:', shareErr)
    } finally {
        resetShareState()
    }
}

const downloadPhoto = async () => {
    if (isSharing.value) return
    isSharing.value = true
    try {
        const timestamp = props.photo.updatedAt || props.photo.createdAt || ''
        const response = await fetch(buildAssetUrl(`/api/assets/full/${props.photo.id}?t=${timestamp}`))
        const blob = await response.blob()

        // Regular download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = props.photo.originalName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
        console.error('Download failed:', err)
    } finally {
        isSharing.value = false
    }
}
</script>

<style scoped>
.favorite-btn-active {
    background: color-mix(in srgb, var(--error) 30%, transparent);
    color: color-mix(in srgb, var(--error) 65%, var(--accent-text));
}
.favorite-btn-active:hover {
    background: color-mix(in srgb, var(--error) 40%, transparent);
}
.favorite-btn-active:active {
    background: color-mix(in srgb, var(--error) 50%, transparent);
}
.favorite-solid {
    background: color-mix(in srgb, var(--error) 80%, transparent);
    color: var(--accent-text);
}
.favorite-solid:hover {
    background: color-mix(in srgb, var(--error) 90%, transparent);
}
.glass-control {
    background: rgba(24, 24, 24, 0.58);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
}

.share-popup-enter-active,
.share-popup-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.share-popup-enter-from,
.share-popup-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(12px);
}
</style>
