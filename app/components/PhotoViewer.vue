<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
        @click.self="$emit('close')">

        <!-- Desktop Header Controls -->
        <div class="hidden md:flex absolute top-0 left-0 right-0 p-4 z-50 justify-end gap-2">
            <button @click="downloadPhoto"
                class="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
            <button @click="$emit('close')"
                class="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

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
                <button @click="downloadPhoto"
                    class="p-4 rounded-full bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition backdrop-blur-sm shadow-lg shadow-purple-600/20">
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

        <div class="flex flex-col md:flex-row w-full h-full max-w-7xl mx-auto md:p-4 md:gap-4">
            <!-- Main Image Area -->
            <div
                class="flex-1 flex items-center justify-center relative group overflow-hidden px-4 md:px-0 pt-20 md:pt-0">
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

                <div class="relative w-full h-full flex items-center justify-center">
                    <img v-if="photo.blurhash"
                        :src="getBlurhashUrl(photo.blurhash, photo.width ?? null, photo.height ?? null) || ''"
                        class="absolute inset-0 w-full h-full object-contain blur-xl scale-105 opacity-50" />
                    <img :src="photo.url" :alt="photo.filename"
                        class="relative max-h-full max-w-full object-contain rounded-lg shadow-2xl z-10" />
                </div>
            </div>

            <!-- Info Sidebar (Desktop) / Bottom Sheet (Mobile) -->
            <div :class="[
                'bg-gray-900/95 backdrop-blur-xl border-white/10 overflow-y-auto transition-transform duration-300',
                // Mobile: Bottom sheet
                'fixed bottom-0 left-0 right-0 rounded-t-3xl border-t md:border-l md:border-t-0',
                'max-h-[70vh] md:max-h-none',
                // Desktop: Side panel
                'md:static md:w-80 md:rounded-r-xl md:rounded-t-none',
                // Transform
                showInfo ? 'translate-y-0' : 'translate-y-full md:translate-y-0',
                'z-40'
            ]">
                <!-- Mobile: Drag Handle -->
                <div class="md:hidden flex justify-center pt-2 pb-4">
                    <div class="w-12 h-1.5 bg-white/30 rounded-full"></div>
                </div>

                <div class="px-6 pb-6 md:pt-6">
                    <h3 class="text-xl font-bold text-white mb-6">Photo Details</h3>

                    <!-- Uploader Info -->
                    <div class="mb-6">
                        <h4 class="text-sm font-medium text-purple-300 mb-2">Uploaded By</h4>
                        <div class="flex items-center space-x-3">
                            <div
                                class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                {{ photo.uploader?.name?.charAt(0) || '?' }}
                            </div>
                            <div>
                                <p class="text-white font-medium">{{ photo.uploader?.name || 'Unknown' }}</p>
                                <p class="text-xs text-white/50">{{ formatDate(photo.createdAt) }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- EXIF Data -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-purple-300 border-b border-white/10 pb-2">Camera Info</h4>

                        <div v-if="photo.cameraModel" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Camera</span>
                            <span class="text-white text-right">{{ photo.cameraModel }}</span>
                        </div>

                        <div v-if="photo.lens" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Lens</span>
                            <span class="text-white text-right">{{ photo.lens }}</span>
                        </div>

                        <div v-if="photo.focalLength" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Focal Length</span>
                            <span class="text-white text-right">{{ photo.focalLength }}</span>
                        </div>

                        <div v-if="photo.aperture" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Aperture</span>
                            <span class="text-white text-right">{{ photo.aperture }}</span>
                        </div>

                        <div v-if="photo.shutterSpeed" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Shutter</span>
                            <span class="text-white text-right">{{ photo.shutterSpeed }}</span>
                        </div>

                        <div v-if="photo.iso" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">ISO</span>
                            <span class="text-white text-right">{{ photo.iso }}</span>
                        </div>

                        <div v-if="photo.dateTaken" class="grid grid-cols-2 gap-2 text-sm">
                            <span class="text-white/50">Taken On</span>
                            <span class="text-white text-right">{{ formatDate(photo.dateTaken) }}</span>
                        </div>
                    </div>

                    <!-- File Info -->
                    <div class="mt-8 pt-6 border-t border-white/10 space-y-2">
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">Filename</span>
                            <span class="text-white text-right truncate" :title="photo.originalName">{{
                                photo.originalName }}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <span class="text-white/50">Size</span>
                            <span class="text-white text-right">{{ formatSize(photo.size) }}</span>
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
    url: string
    filename: string
    originalName: string
    size: number
    createdAt: number
    uploader: {
        name: string | null
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
}>()

const emit = defineEmits(['close', 'previous', 'next'])

const showInfo = ref(false)

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

const downloadPhoto = async () => {
    try {
        const response = await fetch(props.photo.url)
        const blob = await response.blob()
        const file = new File([blob], props.photo.originalName, { type: blob.type })

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: props.photo.originalName,
            })
        } else {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = props.photo.originalName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }
    } catch (err) {
        console.error('Download failed:', err)
    }
}
</script>
