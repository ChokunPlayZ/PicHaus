<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-hidden"
        @click.self="$emit('close')" style="touch-action: none;">



        <!-- Mobile Top Action Bar -->
        <div
            class="md:hidden fixed top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-4 z-50 flex items-center justify-between">
            <!-- Left: Navigation -->
            <div class="flex gap-2">
                <button v-if="hasPrevious" @click="$emit('previous')"
                    class="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button v-if="hasNext" @click="$emit('next')"
                    class="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <!-- Right: Actions -->
            <div class="flex gap-2">
                <button @click="showInfo = !showInfo" :class="[
                    'p-4 rounded-full text-white transition backdrop-blur-sm',
                    showInfo ? 'bg-purple-500/30 hover:bg-purple-500/40' : 'bg-white/10 hover:bg-white/20'
                ]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <!-- iOS: Download button that triggers share sheet -->
                <button v-if="isIOS" @click="sharePhoto"
                    class="p-4 rounded-full bg-[var(--btn-primary-start)] text-white hover:bg-[var(--btn-primary-hover-start)] active:bg-[var(--btn-primary-active)] transition backdrop-blur-sm shadow-lg shadow-[var(--shadow-primary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <!-- Android: Share + Download buttons -->
                <template v-else-if="isAndroid">
                    <button @click="sharePhoto"
                        class="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                    <button @click="downloadPhoto"
                        class="p-4 rounded-full bg-[var(--btn-primary-start)] text-white hover:bg-[var(--btn-primary-hover-start)] active:bg-[var(--btn-primary-active)] transition backdrop-blur-sm shadow-lg shadow-[var(--shadow-primary)]">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                </template>
                <!-- Desktop/Other: Download button only -->
                <button v-else @click="downloadPhoto"
                    class="p-4 rounded-full bg-[var(--btn-primary-start)] text-white hover:bg-[var(--btn-primary-hover-start)] active:bg-[var(--btn-primary-active)] transition backdrop-blur-sm shadow-lg shadow-[var(--shadow-primary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <button @click="$emit('close')"
                    class="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 transition backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <div class="flex flex-col md:flex-row w-full h-full mx-auto md:p-4 md:gap-4">
            <!-- Main Image Area -->
            <div class="flex-1 flex items-center justify-center relative group overflow-hidden px-4 md:px-0 pt-20 md:pt-0"
                @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">

                <button @click.stop="isIOS ? sharePhoto() : downloadPhoto()" @touchstart.stop.prevent
                    @touchmove.stop.prevent
                    class="hidden md:block absolute top-4 right-4 p-3 rounded-full bg-[var(--btn-primary-start)] text-white hover:bg-[var(--btn-primary-hover-start)] transition z-20 shadow-lg shadow-[var(--shadow-primary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>

                <!-- Desktop Navigation Buttons -->
                <button v-if="hasPrevious" @click="$emit('previous')"
                    class="hidden md:block absolute left-4 p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <button v-if="hasNext" @click="$emit('next')"
                    class="hidden md:block absolute right-4 p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <div class="relative w-full h-full flex items-center justify-center" :style="imageContainerStyle">
                    <img v-if="photo.blurhash"
                        :src="getBlurhashUrl(photo.blurhash, photo.width ?? null, photo.height ?? null) || ''"
                        class="absolute inset-0 w-full h-full object-contain blur-xl scale-105 opacity-50" />

                    <!-- Loading Spinner -->
                    <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center z-20">
                        <div class="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white">
                        </div>
                    </div>

                    <img :src="`/api/assets/${photo.id}/full`" :alt="photo.filename" @load="onImageLoad"
                        class="relative max-h-full max-w-full object-contain rounded-lg shadow-2xl z-10"
                        :class="{ 'opacity-0': imageLoading }" />
                </div>
            </div>

            <!-- Mobile Backdrop (when info is open) -->
            <div v-if="showInfo" @click="showInfo = false" class="md:hidden fixed inset-0 bg-black/50 z-30"></div>

            <!-- Info Sidebar (Desktop) / Bottom Sheet (Mobile) -->
            <div :class="[
                'bg-gray-900/95 backdrop-blur-xl border-white/10 overflow-y-auto',
                // Mobile: Bottom sheet
                'fixed bottom-0 left-0 right-0 rounded-t-3xl border-t md:border-l md:border-t-0',
                'max-h-[70vh] md:max-h-none',
                // Desktop: Side panel
                'md:static md:w-80 md:rounded-r-xl md:rounded-t-none',
                'z-40',
                // Only apply transition when not actively swiping
                !isSwiping && 'transition-transform duration-300'
            ]" :style="mobileTransformStyle" @touchstart="handleInfoTouchStart" @touchmove="handleInfoTouchMove"
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
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 class="text-left text-2xl font-bold text-white line-clamp-2">
                            Photo Details</h3>
                    </div>

                    <!-- Uploader Info -->
                    <div class="mb-6">
                        <h4 class="text-sm font-medium text-purple-300 mb-2">Uploaded By</h4>
                        <div class="flex items-center space-x-3">
                            <div
                                class="w-10 h-10 rounded-full bg-gradient-to-br from-[#f9d4e0] to-[#b0ace8] flex items-center justify-center text-white font-bold">
                                {{ photo.uploader?.name?.charAt(0) || '?' }}
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <p class="text-white font-medium">{{ photo.uploader?.name || 'Unknown' }}</p>
                                    <a v-if="photo.uploader?.instagram"
                                        :href="getInstagramUrl(photo.uploader.instagram)" target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-purple-400 hover:text-purple-300 transition">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path
                                                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </a>
                                </div>
                                <p class="text-xs text-white/50">{{ formatDate(photo.createdAt) }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- EXIF Data -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-purple-300 border-b border-white/10 pb-2">Camera Info</h4>

                        <div v-if="photo.cameraModel" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Camera</span>
                            <span class="text-white md:text-right">{{ photo.cameraModel }}</span>
                        </div>

                        <div v-if="photo.lens" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Lens</span>
                            <span class="text-white md:text-right">{{ photo.lens }}</span>
                        </div>

                        <div v-if="photo.focalLength" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Focal Length</span>
                            <span class="text-white md:text-right">{{ photo.focalLength }}</span>
                        </div>

                        <div v-if="photo.aperture" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Aperture</span>
                            <span class="text-white md:text-right">{{ photo.aperture }}</span>
                        </div>

                        <div v-if="photo.shutterSpeed"
                            class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Shutter</span>
                            <span class="text-white md:text-right">{{ photo.shutterSpeed }}</span>
                        </div>

                        <div v-if="photo.iso" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">ISO</span>
                            <span class="text-white md:text-right">{{ photo.iso }}</span>
                        </div>

                        <div v-if="photo.dateTaken" class="flex justify-between md:grid md:grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Taken On</span>
                            <span class="text-white md:text-right">{{ formatDate(photo.dateTaken) }}</span>
                        </div>
                    </div>

                    <!-- File Info -->
                    <div class="mt-8 pt-6 border-t border-white/10 space-y-2">
                        <div class="flex justify-between md:grid md:grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">Filename</span>
                            <span class="text-white md:text-right truncate" :title="photo.originalName">{{
                                photo.originalName }}</span>
                        </div>
                        <div class="flex justify-between md:grid md:grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">Size</span>
                            <span class="text-white md:text-right">{{ formatSize(photo.size) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { decode } from 'blurhash'

interface Photo {
    id: string

    filename: string
    originalName: string
    size: number
    createdAt: number
    uploader: {
        name: string | null
        instagram?: string | null
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
}

const props = defineProps<{
    photo: Photo
    hasPrevious: boolean
    hasNext: boolean
    previousPhotoId?: string | null
    nextPhotoId?: string | null
}>()

const emit = defineEmits(['close', 'previous', 'next'])

const showInfo = ref(false)
const imageLoading = ref(true)

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
    imageLoading.value = false
}

// Watch for photo changes to reset loading state and preload adjacent images
watch(() => props.photo.id, (newId, oldId) => {
    if (newId !== oldId) {
        imageLoading.value = true

        // Preload adjacent images
        nextTick(() => {
            if (props.previousPhotoId) {
                preloadImage(props.previousPhotoId)
            }
            if (props.nextPhotoId) {
                preloadImage(props.nextPhotoId)
            }
        })
    }
}, { immediate: true })

// Preload image function
const preloadImage = (photoId: string) => {
    const img = new Image()
    img.src = `/api/assets/${photoId}/full`
}

// Prevent body scroll when viewer is open
onMounted(() => {
    document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
    document.body.style.overflow = ''
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
    if (!isImageSwiping.value) {
        return {
            transition: 'transform 0.3s ease-out',
            transform: 'translateX(0)'
        }
    }
    return {
        transform: `translateX(${imageSwipeOffset.value}px)`,
        transition: 'none'
    }
})

// Touch/Swipe handling for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)
const touchStartY = ref(0)
const touchEndY = ref(0)
const minSwipeDistance = 50 // minimum distance for a swipe
const imageSwipeOffset = ref(0)
const isImageSwiping = ref(false)

const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
    touchEndX.value = e.touches[0].clientX
    touchEndY.value = e.touches[0].clientY
    isImageSwiping.value = false
}

const handleTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return
    touchEndX.value = e.touches[0].clientX
    touchEndY.value = e.touches[0].clientY

    const deltaX = touchEndX.value - touchStartX.value
    const deltaY = touchEndY.value - touchStartY.value

    // Only show swipe feedback for horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isImageSwiping.value = true
        // Add resistance at boundaries
        if ((deltaX > 0 && !props.hasPrevious) || (deltaX < 0 && !props.hasNext)) {
            imageSwipeOffset.value = deltaX * 0.3 // 30% resistance at boundaries
        } else {
            imageSwipeOffset.value = deltaX
        }
    }
}

const handleTouchEnd = () => {
    const deltaX = touchStartX.value - touchEndX.value
    const deltaY = touchStartY.value - touchEndY.value

    // Only trigger swipe if horizontal movement is greater than vertical (to avoid conflict with scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && props.hasNext) {
            // Swipe left - next photo
            emit('next')
        } else if (deltaX < 0 && props.hasPrevious) {
            // Swipe right - previous photo
            emit('previous')
        }
    }

    // Reset values
    touchStartX.value = 0
    touchEndX.value = 0
    touchStartY.value = 0
    touchEndY.value = 0
    imageSwipeOffset.value = 0
    isImageSwiping.value = false
}

// Info panel touch/swipe handling for dismiss
const infoTouchStartY = ref(0)
const infoTouchEndY = ref(0)
const swipeOffset = ref(0)
const isSwiping = ref(false)
const minSwipeDownDistance = 80 // minimum distance for swipe down to dismiss

const handleInfoTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return
    infoTouchStartY.value = e.touches[0].clientY
    isSwiping.value = true
}

const handleInfoTouchMove = (e: TouchEvent) => {
    if (!isSwiping.value || !e.touches[0]) return

    infoTouchEndY.value = e.touches[0].clientY
    const deltaY = infoTouchEndY.value - infoTouchStartY.value

    // Only allow downward movement (deltaY > 0)
    if (deltaY > 0) {
        swipeOffset.value = deltaY
        // Prevent page scroll while swiping the panel
        e.preventDefault()
    }
}

const handleInfoTouchEnd = () => {
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

const getBlurhashUrl = (hash: string | null, width: number | null, height: number | null) => {
    if (!hash || !width || !height) return null

    // Use smaller dimensions for blurhash
    const w = 32
    const h = Math.round(w * (height / width))

    const pixels = decode(hash, w, h)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const imageData = ctx.createImageData(w, h)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
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
    window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        emit('close')
    } else if (e.key === 'ArrowLeft' && props.hasPrevious) {
        emit('previous')
    } else if (e.key === 'ArrowRight' && props.hasNext) {
        emit('next')
    }
}

const getInstagramUrl = (instagram: string | null) => {
    if (!instagram) return ''
    // Remove @ if present
    const username = instagram.startsWith('@') ? instagram.slice(1) : instagram
    return `https://instagram.com/${username}`
}

const sharePhoto = async () => {
    try {
        const response = await fetch(`/api/assets/${props.photo.id}/full`)
        const blob = await response.blob()
        const file = new File([blob], props.photo.originalName, { type: blob.type })

        if (navigator.share) {
            try {
                await navigator.share({
                    files: [file],
                    title: props.photo.originalName,
                })
            } catch (shareErr: any) {
                // If user cancelled, just return
                if (shareErr.name === 'AbortError') {
                    return
                }
                console.error('Share failed:', shareErr)
            }
        }
    } catch (err) {
        console.error('Share failed:', err)
    }
}

const downloadPhoto = async () => {
    try {
        const response = await fetch(`/api/assets/${props.photo.id}/full`)
        const blob = await response.blob()

        // Regular download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = props.photo.originalName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (err) {
        console.error('Download failed:', err)
    }
}
</script>
