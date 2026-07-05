<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <!-- Initial Loading/Auth State -->
        <div v-if="!isAuthenticated" class="min-h-screen flex items-center justify-center p-4">
            <div class="rounded-2xl p-8 max-w-md w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="text-center mb-8">
                    <img v-if="linkData?.data?.logoImageId" :src="`/api/assets/logo/${linkData.data.logoImageId}`"
                        alt="Logo" class="h-12 max-w-[180px] object-contain mx-auto mb-2" />
                    <h1 v-else class="text-3xl font-bold mb-2" style="color: var(--text-1);">{{ linkData?.data?.logoText || '📸 PicHaus' }}</h1>
                    <div v-if="loading" class="flex justify-center">
                        <div class="w-6 h-6 rounded-full border-2 animate-spin"
                            style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                    </div>
                    <p v-else-if="error" style="color: var(--error);">{{ error }}</p>
                    <p v-else class="text-sm" style="color: var(--text-2);">
                        {{ pageTitle }}
                        <span v-if="ownerName" class="block text-xs mt-1" style="color: var(--text-3);">{{ t('by') }} {{ ownerName }}</span>
                    </p>
                </div>

                <div v-if="!loading && !error && requiresPassword">
                    <form @submit.prevent="handleAccess" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">{{ t('passwordRequired') }}</label>
                            <input v-model="password" type="password" required :placeholder="t('passwordPlaceholder')"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <button type="submit" :disabled="accessing"
                            class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!accessing && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ accessing ? t('accessing') : t('viewAccess') }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Authenticated Content -->
        <div v-else class="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-8">

            <!-- Group View -->
            <div v-if="viewMode === 'group'">
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl font-bold mb-3 tracking-tight" style="color: var(--text-1);">{{ groupTitle }}</h1>
                    <p v-if="groupDescription" class="text-base max-w-2xl mx-auto" style="color: var(--text-2);">{{ groupDescription }}</p>
                    <div class="mt-2 text-sm" style="color: var(--text-3);">{{ t('collectionBy').replace('{owner}', ownerName || '') }}</div>
                    <button @click="viewAllGroupPhotos"
                        class="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold transition inline-flex items-center gap-2"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <Icon name="lucide:image" class="h-4 w-4" :stroke-width="2" />
                        {{ t('viewAllPictures') }}
                    </button>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <AlbumCard
                        v-for="album in groupAlbums"
                        :key="album.id"
                        :album="album"
                        :photo-count="album.photoCount"
                        @click="openAlbum(album)"
                    />
                </div>
            </div>

            <!-- All Group Photos View -->
            <div v-else-if="viewMode === 'all-group-photos'">
                <!-- Header -->
                <div
                    class="pt-4 sm:pt-0 mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="text-left md:text-left">
                        <div class="mb-2">
                            <button @click="unloadFavorites(); viewMode = 'group'"
                                class="flex items-center gap-1 text-sm px-3 py-1 rounded-full transition"
                                style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                                <Icon name="lucide:arrow-left" class="h-4 w-4" :stroke-width="2" />
                                {{ t('backToGroup').replace('{group}', groupTitle || '') }}
                            </button>
                        </div>
                        <h1 class="text-4xl sm:text-4xl lg:text-5xl font-bold mb-2 tracking-tight" style="color: var(--text-1);">{{ t('allPictures') }}</h1>
                        <div class="text-sm" style="color: var(--text-2);">
                            <span v-if="groupDescription">{{ groupDescription }}</span>
                        </div>
                    </div>
                </div>

                <!-- Loading Photos State -->
                <div v-if="loadingPhotos && photos.length === 0" class="flex justify-center py-12">
                    <div class="w-8 h-8 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>

                <!-- Empty State -->
                <div v-else-if="photos.length === 0" class="text-center py-12 rounded-2xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <div class="text-5xl sm:text-6xl mb-4">📷</div>
                    <h3 class="text-lg sm:text-xl font-bold mb-2" style="color: var(--text-1);">{{ t('noPhotosYet') }}</h3>
                </div>

                <!-- Photo Grid -->
                <div v-else-if="picturesLayout" ref="containerRef" class="relative w-full"
                    :style="{ height: `${picturesLayout.containerHeight}px` }">
                    <PhotoTile
                        v-for="(photo, index) in photos"
                        :key="photo.id"
                        :photo="photo"
                        :position="picturesLayout.getPosition(index)"
                        :show-favorite="true"
                        :favorited="isFavorited(photo.id)"
                        @click="openPhotoViewer(index)"
                        @toggle-favorite="toggleFavorite(photo.id)"
                    />
                </div>

                <!-- Infinite Scroll Sentinel -->
                <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                    <div v-if="loadingMore" class="w-6 h-6 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>
            </div>

            <!-- Album View -->
            <div v-else>
                <!-- Header -->
                <div
                    class="pt-4 sm:pt-0 mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="text-left md:text-left">
                        <div v-if="shareType === 'group'" class="mb-2">
                            <button @click="unloadFavorites(); viewMode = 'group'"
                                class="flex items-center gap-1 text-sm px-3 py-1 rounded-full transition"
                                style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                                <Icon name="lucide:arrow-left" class="h-4 w-4" :stroke-width="2" />
                                {{ t('backToGroup').replace('{group}', groupTitle || '') }}
                            </button>
                        </div>
                        <h1 class="text-4xl sm:text-4xl lg:text-5xl font-bold mb-2 tracking-tight" style="color: var(--text-1);">{{ albumName }}</h1>
                        <div class="text-sm" style="color: var(--text-2);">
                            <span v-if="eventDate">{{ formatDate(eventDate) }}</span>
                            <div v-if="description" class="whitespace-pre-line mt-1" style="color: var(--text-3);">{{ description }}</div>
                            <div v-if="photographers.length > 0" class="flex items-center gap-2 mt-2">
                                <span style="color: var(--text-3);">{{ t('by') }}</span>
                                <button @click="showPhotographersModal = true"
                                    class="transition underline decoration-dotted" style="color: var(--accent);">
                                    {{ photographersDisplay }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Loading Photos State -->
                <div v-if="loadingPhotos && photos.length === 0" class="flex justify-center py-12">
                    <div class="w-8 h-8 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>

                <!-- Empty State -->
                <div v-else-if="photos.length === 0" class="text-center py-12 rounded-2xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <div class="text-5xl sm:text-6xl mb-4">📷</div>
                    <h3 class="text-lg sm:text-xl font-bold mb-2" style="color: var(--text-1);">{{ t('noPhotosYet') }}</h3>
                </div>

                <!-- Photo Grid -->
                <div v-else-if="picturesLayout" ref="containerRef" class="relative w-full"
                    :style="{ height: `${picturesLayout.containerHeight}px` }">
                    <PhotoTile
                        v-for="(photo, index) in photos"
                        :key="photo.id"
                        :photo="photo"
                        :position="picturesLayout.getPosition(index)"
                        :show-favorite="true"
                        :favorited="isFavorited(photo.id)"
                        @click="openPhotoViewer(index)"
                        @toggle-favorite="toggleFavorite(photo.id)"
                    />
                </div>

                <!-- Infinite Scroll Sentinel -->
                <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                    <div v-if="loadingMore" class="w-6 h-6 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>
            </div>
        </div>

        <!-- Photographers Modal -->
        <div v-if="showPhotographersModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showPhotographersModal = false">
            <div class="rounded-2xl p-6 max-w-md w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold" style="color: var(--text-1);">{{ t('photographers') }}</h3>
                    <button @click="showPhotographersModal = false" class="p-1 rounded-lg transition"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                        <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
                    </button>
                </div>

                <div class="space-y-2">
                    <div v-for="photographer in photographers" :key="photographer.id"
                        class="p-3 rounded-xl" style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <img v-if="photographer.avatar" :src="photographer.avatar"
                                    class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    style="border: 1px solid var(--separator);" />
                                <div v-else
                                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                    style="background: var(--accent);">
                                    {{ photographer.name?.charAt(0) || '?' }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm truncate" style="color: var(--text-1);">{{ photographer.name }}</p>
                                    <div v-if="photographer.instagram" class="flex items-center gap-2 mt-1">
                                        <span class="text-xs" style="color: var(--text-2);">@{{ photographer.instagram }}</span>
                                        <a :href="`https://instagram.com/${photographer.instagram || ''}`" target="_blank"
                                            rel="noopener noreferrer" style="color: var(--accent);">
                                            <Icon name="lucide:instagram" class="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-xs whitespace-nowrap flex-shrink-0"
                                style="background: var(--accent-light); color: var(--accent);">
                                {{ photographer.role }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Favorites download bar -->
        <Transition name="slide-up">
            <div v-if="favorites.size > 0 && !selectedPhoto"
                class="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-black/85 backdrop-blur-xl border-t border-white/15">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <Icon name="lucide:heart" class="h-5 w-5 text-red-400 flex-shrink-0" style="fill: currentColor;" />
                        <span class="text-white font-medium text-sm sm:text-base">
                            {{ t('selectedCount').replace('{count}', String(favorites.size)).replace('{plural}', favorites.size === 1 ? t('photo') : t('photos')) }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button @click="clearFavorites"
                            class="px-3 py-1.5 text-sm text-white/60 hover:text-white transition rounded-lg hover:bg-white/10">
                            {{ t('clear') }}
                        </button>
                        <button @click="downloadFavorites" :disabled="downloading"
                            class="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition"
                            style="background: var(--accent); color: white;">
                            <Icon name="lucide:download" class="h-4 w-4" :stroke-width="2" />
                            {{ t('download') }}{{ favorites.size > 1 ? ` (${favorites.size})` : '' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Download Progress Modal -->
        <div v-if="downloading"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);">
            <div class="rounded-2xl p-6 max-w-sm w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-base font-bold mb-4 text-center" style="color: var(--text-1);">
                    {{ pendingShareFiles ? (isSharing ? t('sharingPhotos') : t('photosReadyTitle')) : t('downloadingPhotos') }}
                </h3>

                <template v-if="pendingShareFiles">
                    <div class="mb-6 text-center">
                        <p class="text-sm" :class="isSharing ? 'mb-2' : ''" style="color: var(--text-2);">
                            {{ t('photosReady') }}
                        </p>
                        <p v-if="isSharing" class="text-xs font-semibold animate-pulse" style="color: var(--accent);">
                            {{ t('doNotClose') }}
                        </p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button @click="shareFavorites"
                            :disabled="isSharing"
                            class="w-full py-3 rounded-xl text-sm font-semibold transition active:scale-95 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                            style="background: var(--accent);">
                            <span v-if="isSharing" class="w-4 h-4 rounded-full border-2 animate-spin"
                                style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></span>
                            {{ isSharing ? t('accessing').replace('...', '') : t('shareSaveNow') }}
                        </button>
                        <button @click="downloadFavoritesAsZip"
                            :disabled="isSharing"
                            class="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                            style="color: var(--text-1); background: var(--surface-2); border: 1px solid var(--separator);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                            <Icon name="lucide:download" class="h-4 w-4" :stroke-width="2" />
                            {{ t('downloadZip') }}
                        </button>
                        <button @click="cancelShare"
                            :disabled="isSharing"
                            class="w-full py-3 rounded-xl text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
                            style="color: var(--text-2);">
                            {{ t('cancel') }}
                        </button>
                    </div>
                </template>
                <template v-else>
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
                </template>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
            :has-next="selectedPhotoIndex! < (photos.length || 0) - 1" :previous-photo-id="previousPhotoId"
            :next-photo-id="nextPhotoId" :show-metadata="showMetadata"
            :is-favorited="selectedPhoto ? isFavorited(selectedPhoto.id) : false"
            @close="closePhotoViewer" @previous="previousPhoto" @next="nextPhoto"
            @toggle-favorite="selectedPhoto && toggleFavorite(selectedPhoto.id)" />
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

                <h3 class="text-xl font-bold mb-1" style="color: var(--text-1);">{{ isIOS ? t('downloadComplete') : t('downloadStarted') }}</h3>
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
                                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                style="background: var(--accent);">
                                {{ photographer.name?.charAt(0) || '?' }}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-sm truncate" style="color: var(--text-1);">{{ photographer.name }}</p>
                                <p v-if="photographer.instagram" class="text-xs mt-0.5 truncate" style="color: var(--text-3);">@{{ photographer.instagram }}</p>
                            </div>
                        </div>
                        <a v-if="photographer.instagram"
                            :href="`https://instagram.com/${photographer.instagram}`"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0"
                            style="background: var(--accent); color: white;"
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

    </div>
</template>

<script setup lang="ts">
const dialog = useDialog()
import JSZip from 'jszip'
import { setAuthToken, buildAssetUrl } from '~/utils/auth-client'

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

interface Photo {
    id: string

    filename: string
    originalName: string
    size: number
    width: number | null
    height: number | null
    blurhash: string | null
    dateTaken: number | null
    createdAt: number
    uploader: {
        id: string
        name: string | null
    } | null
    // EXIF data
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
}

const route = useRoute()
const token = route.params.token as string

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = UUID_REGEX.test(token)
const isPublicAlbum = ref(false)

// Auth State
const loading = ref(true)
const error = ref('')
const requiresPassword = ref(false)
const password = ref('')
const accessing = ref(false)
const isAuthenticated = ref(false)
const showMetadata = ref(true)

// View Mode
const viewMode = ref<'album' | 'group' | 'all-group-photos'>('album')
const shareType = ref<'album' | 'group' | 'view' | 'upload'>('view')

// Group Data
const groupTitle = ref('')
const groupDescription = ref('')
const groupAlbums = ref<any[]>([])

// Album Metadata
const albumId = ref('')
const albumName = ref('')
const ownerName = ref('')
const description = ref('')
const eventDate = ref<number | null>(null)

const pageTitle = computed(() => {
    if (viewMode.value === 'all-group-photos') return `All Pictures from ${groupTitle.value}`
    return viewMode.value === 'group' ? groupTitle.value : albumName.value
})

// Photos State
const photos = ref<Photo[]>([])
const loadingPhotos = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const limit = ref(50)
const hasMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)

// Layout State
const { containerRef, picturesLayout } = useJustifiedLayout(photos)

// Download State
const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })
const pendingShareFiles = ref<File[] | null>(null)
const isSharing = ref(false)
const showDownloadSuccessModal = ref(false)
const downloadedPhotographers = ref<any[]>([])
const photosToSupportAfterShare = ref<any[]>([])

const translations = {
    en: {
        backToGroup: 'Back to {group}',
        by: 'by',
        noPhotosYet: 'No photos yet',
        downloadStarted: 'Download Started!',
        downloadComplete: 'Download Complete!',
        supportPhotographers: 'Support the photographers who made these shots possible by tagging or following them:',
        done: 'Done',
        photographers: 'Photographers',
        photosReady: 'Your photos are ready to share.',
        doNotClose: 'Do not close until this dialog closes.',
        shareSaveNow: 'Share/Save Now',
        downloadZip: 'Download ZIP',
        cancel: 'Cancel',
        progress: 'Progress',
        filesProcessed: 'files processed',
        clear: 'Clear',
        download: 'Download',
        downloadingPhotos: 'Downloading Photos',
        sharingPhotos: 'Sharing Photos',
        photosReadyTitle: 'Photos Ready',
        // password
        passwordRequired: 'Password Required',
        passwordPlaceholder: 'Enter password',
        accessing: 'Accessing...',
        viewAccess: 'View Access',
        collectionBy: 'Collection by {owner}',
        viewAllPictures: 'View All Pictures',
        allPictures: 'All Pictures',
        selectedCount: '{count} {plural} selected',
        photo: 'photo',
        photos: 'photos'
    },
    th: {
        backToGroup: 'กลับไปที่ {group}',
        by: 'โดย',
        noPhotosYet: 'ยังไม่มีรูปภาพ',
        downloadStarted: 'เริ่มดาวน์โหลดแล้ว!',
        downloadComplete: 'ดาวน์โหลดเสร็จสิ้น!',
        supportPhotographers: 'สนับสนุนช่างภาพที่ถ่ายภาพเหล่านี้ด้วยการแท็กหรือติดตามพวกเขา:',
        done: 'เสร็จสิ้น',
        photographers: 'ช่างภาพ',
        photosReady: 'รูปภาพของคุณพร้อมสำหรับการแชร์แล้ว',
        doNotClose: 'กรุณาอย่าปิดจนกว่ากล่องข้อความนี้จะปิดลง',
        shareSaveNow: 'แชร์/บันทึกทันที',
        downloadZip: 'ดาวน์โหลดไฟล์ ZIP',
        cancel: 'ยกเลิก',
        progress: 'ความคืบหน้า',
        filesProcessed: 'ไฟล์ได้รับการประมวลผลแล้ว',
        clear: 'ล้างข้อมูล',
        download: 'ดาวน์โหลด',
        downloadingPhotos: 'กำลังดาวน์โหลดรูปภาพ',
        sharingPhotos: 'กำลังแชร์รูปภาพ',
        photosReadyTitle: 'รูปภาพพร้อมแล้ว',
        // password
        passwordRequired: 'ต้องระบุรหัสผ่าน',
        passwordPlaceholder: 'ป้อนรหัสผ่าน',
        accessing: 'กำลังตรวจสอบ...',
        viewAccess: 'ดูข้อมูล',
        collectionBy: 'คอลเลกชันโดย {owner}',
        viewAllPictures: 'ดูรูปภาพทั้งหมด',
        allPictures: 'รูปภาพทั้งหมด',
        selectedCount: 'เลือกแล้ว {count} {plural}',
        photo: 'รูปภาพ',
        photos: 'รูปภาพ'
    }
}

const currentLang = ref<'en' | 'th'>('en')

onMounted(() => {
    if (typeof navigator !== 'undefined') {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
        if (lang.toLowerCase().startsWith('th')) {
            currentLang.value = 'th'
        }
    }
})

const t = (key: keyof typeof translations.en) => {
    return translations[currentLang.value][key] || translations.en[key]
}

const showSupportPopup = (downloadedPhotos: any[]) => {
    const map = new Map()
    downloadedPhotos.forEach(photo => {
        const u = photo.uploader || (photo.uploaderId ? {
            id: photo.uploaderId,
            name: photo.uploaderName,
            instagram: photo.uploaderInstagram,
            avatar: photo.uploaderAvatarPath ? `/api/assets/avatar/${photo.uploaderId}` : null
        } : null)

        if (u) {
            map.set(u.id, {
                id: u.id,
                name: u.name || 'Unknown',
                instagram: u.instagram || null,
                avatar: u.avatar || null
            })
        } else if (linkData.value?.data?.owner) {
            const owner = linkData.value.data.owner
            map.set(owner.id, {
                id: owner.id,
                name: owner.name || 'Unknown',
                instagram: owner.instagram || null,
                avatar: owner.avatar ? `/api/assets/avatar/${owner.id}` : null
            })
        }
    })
    downloadedPhotographers.value = Array.from(map.values())
    showDownloadSuccessModal.value = true
}

const shareFavorites = async () => {
    if (!pendingShareFiles.value || !navigator.share) return
    isSharing.value = true
    let sharedSuccessfully = false
    try {
        await navigator.share({ files: pendingShareFiles.value })
        sharedSuccessfully = true
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Share favorites error:', err)
            dialog.toast('Failed to share photos')
        }
    } finally {
        isSharing.value = false
        downloading.value = false
        pendingShareFiles.value = null
        downloadProgress.value = { current: 0, total: 0 }
        if (sharedSuccessfully) {
            showSupportPopup(photosToSupportAfterShare.value)
        }
    }
}

const cancelShare = () => {
    if (isSharing.value) return
    downloading.value = false
    pendingShareFiles.value = null
    downloadProgress.value = { current: 0, total: 0 }
}

const downloadFavoritesAsZip = async () => {
    if (!pendingShareFiles.value) return
    isSharing.value = true
    let downloadSuccess = false
    try {
        const folderName = (viewMode.value === 'album' ? albumName.value : groupTitle.value) || 'photos'
        const zip = new JSZip()
        const folder = zip.folder(folderName)
        pendingShareFiles.value.forEach(f => {
            folder?.file(f.name, f)
        })
        const content = await zip.generateAsync({ type: 'blob' })
        downloadBlob(content, `${folderName}-selected.zip`)
        downloadSuccess = true
    } catch (err) {
        console.error('Download ZIP error:', err)
        dialog.toast('Failed to download ZIP')
    } finally {
        isSharing.value = false
        downloading.value = false
        pendingShareFiles.value = null
        downloadProgress.value = { current: 0, total: 0 }
        if (downloadSuccess) {
            showSupportPopup(photosToSupportAfterShare.value)
        }
    }
}

// Favorites State — reactive object so toggling one photo only re-renders that tile
const favoritesMap = reactive<Record<string, boolean>>({})
const favorites = computed(() => new Set(Object.keys(favoritesMap).filter(k => favoritesMap[k])))

const favoritesKey = (contextId: string) => `pichaus_favorites_${token}_${contextId}`

const currentFavoritesKey = computed(() => {
    if (viewMode.value === 'album' && albumId.value) return favoritesKey(albumId.value)
    if (viewMode.value === 'all-group-photos') return favoritesKey('all')
    return null
})

const isFavorited = (photoId: string) => !!favoritesMap[photoId]

const toggleFavorite = (photoId: string) => {
    if (favoritesMap[photoId]) {
        delete favoritesMap[photoId]
    } else {
        favoritesMap[photoId] = true
    }
    const key = currentFavoritesKey.value
    if (!key) return
    nextTick(() => {
        const ids = Object.keys(favoritesMap).filter(k => favoritesMap[k])
        if (ids.length > 0) {
            localStorage.setItem(key, JSON.stringify(ids))
        } else {
            localStorage.removeItem(key)
        }
    })
}

// Clears the reactive map only — keeps localStorage so selections restore on return
const unloadFavorites = () => {
    Object.keys(favoritesMap).forEach(k => delete favoritesMap[k])
}

// Full clear — wipes map + localStorage (for the explicit "Clear" button)
const clearFavorites = () => {
    const key = currentFavoritesKey.value
    unloadFavorites()
    if (key) localStorage.removeItem(key)
}

const loadFavoritesForContext = (contextId: string) => {
    unloadFavorites()
    const saved = localStorage.getItem(favoritesKey(contextId))
    if (saved) {
        try {
            const ids: string[] = JSON.parse(saved)
            ids.forEach(id => { favoritesMap[id] = true })
        } catch {}
    }
}

// Platform detection
const isIOS = computed(() => {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
})

// Photographers modal state
const showPhotographersModal = ref(false)
const photographers = ref<Array<{
    id: string
    name: string
    email: string | null
    instagram: string | null
    role: string
}>>([])

// Computed: Display text for photographers (first names only)
const photographersDisplay = computed(() => {
    return photographers.value
        .map(p => p.name.split(' ')[0]) // Get first name only
        .join(', ')
})

// Download all photos
const downloadAll = async () => {
    if (downloading.value) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: 0 }
    pendingShareFiles.value = null
    isSharing.value = false

    try {
        // Fetch all photo URLs
        const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId.value}/download-info`)
        const photosToDownload = response.data

        if (photosToDownload.length === 0) {
            dialog.toast('No photos to download', 'warning')
            downloading.value = false
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const files: { blob: Blob; name: string }[] = []
        
        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(buildAssetUrl(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`))
                const blob = await res.blob()
                files.push({ blob, name: photo.originalName })
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        })

        await Promise.all(promises)

        if (files.length === 0) {
            downloading.value = false
            return
        }

        let skipCleanup = false
        const folderName = albumName.value || 'album'

        if (isIOS.value && navigator.canShare) {
            const shareFiles = files.map(f => new File([f.blob], f.name, { type: f.blob.type }))
            if (navigator.canShare({ files: shareFiles })) {
                pendingShareFiles.value = shareFiles
                photosToSupportAfterShare.value = photosToDownload
                skipCleanup = true
                return
            }
        }

        // All other platforms: zip download
        const zip = new JSZip()
        const folder = zip.folder(folderName)
        files.forEach(f => folder?.file(f.name, f.blob))
        const content = await zip.generateAsync({ type: 'blob' })
        downloadBlob(content, `${folderName}.zip`)
        showSupportPopup(photosToDownload)
    } catch (err) {
        console.error('Download all error:', err)
        dialog.toast('Failed to download photos')
    } finally {
        if (!skipCleanup) {
            downloading.value = false
            downloadProgress.value = { current: 0, total: 0 }
        }
    }
}

// Download all photos from all group albums
const downloadAllGroupPhotos = async () => {
    if (downloading.value) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: 0 }
    pendingShareFiles.value = null
    isSharing.value = false

    try {
        // Collect all photos to download
        const photosToDownload: any[] = []

        for (const album of groupAlbums.value) {
            try {
                const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${album.id}/download-info`)
                if (response.data && Array.isArray(response.data)) {
                    photosToDownload.push(...response.data.map((p: any) => ({ ...p, albumName: album.name })))
                }
            } catch (err) {
                console.error(`Failed to get download info for album ${album.id}:`, err)
            }
        }

        if (photosToDownload.length === 0) {
            dialog.toast('No photos to download', 'warning')
            downloading.value = false
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const files: { blob: Blob; name: string; albumName?: string }[] = []

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(buildAssetUrl(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`))
                const blob = await res.blob()
                files.push({ blob, name: photo.originalName, albumName: photo.albumName })
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        })

        await Promise.all(promises)

        if (files.length === 0) {
            downloading.value = false
            return
        }

        let skipCleanup = false
        const folderName = groupTitle.value || 'group'

        if (isIOS.value && navigator.canShare) {
            const shareFiles = files.map(f => new File([f.blob], f.name, { type: f.blob.type }))
            if (navigator.canShare({ files: shareFiles })) {
                pendingShareFiles.value = shareFiles
                photosToSupportAfterShare.value = photosToDownload
                skipCleanup = true
                return
            }
        }

        // All other platforms: zip download
        const zip = new JSZip()
        const groupFolder = zip.folder(folderName)
        files.forEach(f => {
            const albumFolder = groupFolder?.folder(f.albumName || 'uncategorized')
            albumFolder?.file(f.name, f.blob)
        })
        const content = await zip.generateAsync({ type: 'blob' })
        downloadBlob(content, `${folderName}-photos.zip`)
        showSupportPopup(photosToDownload)
    } catch (err) {
        console.error('Download all group photos error:', err)
        dialog.toast('Failed to download photos')
    } finally {
        if (!skipCleanup) {
            downloading.value = false
            downloadProgress.value = { current: 0, total: 0 }
        }
    }
}

// Download selected/favorited photos
const downloadFavorites = async () => {
    if (downloading.value || favorites.value.size === 0) return

    const favIds = [...favorites.value]
    let photosToDownload = photos.value.filter(p => favIds.includes(p.id))

    const folderName = (viewMode.value === 'album' ? albumName.value : groupTitle.value) || 'photos'

    downloading.value = true
    downloadProgress.value = { current: 0, total: favIds.length }
    pendingShareFiles.value = null
    isSharing.value = false

    // Check if we need to fetch missing photos (e.g. after a page reload/lazy loading)
    const allFavsLoaded = favIds.every(id => photos.value.some(p => p.id === id))
    if (!allFavsLoaded) {
        try {
            let allAlbumPhotos: any[] = []
            if (viewMode.value === 'album' && albumId.value) {
                const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId.value}/download-info`)
                if (response.success && Array.isArray(response.data)) {
                    allAlbumPhotos = response.data
                }
            } else if ((viewMode.value === 'all-group-photos' || viewMode.value === 'group') && groupAlbums.value.length > 0) {
                for (const album of groupAlbums.value) {
                    try {
                        const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${album.id}/download-info`)
                        if (response.success && Array.isArray(response.data)) {
                            allAlbumPhotos.push(...response.data)
                        }
                    } catch (err) {
                        console.error(`Failed to get download info for album ${album.id}:`, err)
                    }
                }
            }
            if (allAlbumPhotos.length > 0) {
                // Deduplicate photos by ID to be safe
                const seenIds = new Set<string>()
                const uniquePhotos: any[] = []
                for (const photo of allAlbumPhotos) {
                    if (!seenIds.has(photo.id)) {
                        seenIds.add(photo.id)
                        uniquePhotos.push(photo)
                    }
                }
                photosToDownload = uniquePhotos.filter(p => favIds.includes(p.id))
            }
        } catch (err) {
            console.error('Failed to fetch full photo list for download:', err)
        }
    }

    if (photosToDownload.length === 0) {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
        return
    }

    downloadProgress.value.total = photosToDownload.length

    let skipCleanup = false
    try {
        const files: { blob: Blob; name: string }[] = []
        for (const photo of photosToDownload) {
            try {
                const res = await fetch(buildAssetUrl(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`))
                const blob = await res.blob()
                files.push({ blob, name: photo.originalName })
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to fetch ${photo.originalName}`, err)
            }
        }

        if (files.length === 0) return

        // iOS: try Web Share API with multiple files (no zip needed)
        if (isIOS.value && navigator.canShare) {
            const shareFiles = files.map(f => new File([f.blob], f.name, { type: f.blob.type }))
            if (navigator.canShare({ files: shareFiles })) {
                pendingShareFiles.value = shareFiles
                photosToSupportAfterShare.value = photosToDownload
                skipCleanup = true
                return
            }
        }

        // All other platforms: zip download
        const zip = new JSZip()
        const folder = zip.folder(folderName)
        files.forEach(f => folder?.file(f.name, f.blob))
        const content = await zip.generateAsync({ type: 'blob' })
        downloadBlob(content, `${folderName}-selected.zip`)
        showSupportPopup(photosToDownload)
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Download favorites error:', err)
            dialog.toast('Failed to download photos')
        }
    } finally {
        if (!skipCleanup) {
            downloading.value = false
            downloadProgress.value = { current: 0, total: 0 }
        }
    }
}

// Viewer State
const selectedPhotoIndex = ref<number | null>(null)
const selectedPhoto = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    return photos.value[selectedPhotoIndex.value]
})

// Computed: Adjacent photo IDs for preloading
const previousPhotoId = computed(() => {
    if (selectedPhotoIndex.value === null || selectedPhotoIndex.value <= 0) return null
    return photos.value[selectedPhotoIndex.value - 1]?.id || null
})

const nextPhotoId = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    if (selectedPhotoIndex.value >= photos.value.length - 1) return null
    return photos.value[selectedPhotoIndex.value + 1]?.id || null
})

// Initial Data Fetch (SSR)
const { data: linkData, error: linkError } = await useFetch<{ success: boolean; data: any }>(
    isUUID ? `/api/pub/album/${token}` : `/api/v1/upload/${token}`
)

// Populate state from SSR data
if (linkData.value?.data) {
    const data = linkData.value.data
    if (data.isPublicAlbum) isPublicAlbum.value = true
    requiresPassword.value = !!data.requiresPassword
    ownerName.value = data.ownerName || ''

    if (data.type === 'group') {
        viewMode.value = 'group'
        shareType.value = 'group'
        groupTitle.value = data.title || ''
        groupDescription.value = data.description || ''
        groupAlbums.value = Array.isArray(data.albums) ? data.albums : []
        showMetadata.value = data.showMetadata !== undefined ? data.showMetadata : true
    } else {
        viewMode.value = 'album'
        shareType.value = data.shareType || 'view' // 'view' or 'upload'
        albumId.value = data.albumId || ''
        albumName.value = data.albumName || ''
        description.value = data.description || ''
        eventDate.value = data.eventDate || null
        showMetadata.value = data.showMetadata !== undefined ? data.showMetadata : true
    }

    loading.value = false
} else if (linkError.value) {
    error.value = linkError.value.data?.statusMessage || 'Invalid or expired link'
    loading.value = false
}

// Set page title and SEO meta
const url = useRequestURL()
const origin = url.origin

useSeoMeta({
    title: computed(() => pageTitle.value ? `${pageTitle.value} | PicHaus` : 'PicHaus'),
    ogTitle: computed(() => pageTitle.value),
    description: computed(() => (viewMode.value === 'group' ? groupDescription.value : description.value) || `View ${pageTitle.value || 'photos'} on PicHaus`),
    ogDescription: computed(() => (viewMode.value === 'group' ? groupDescription.value : description.value) || `View ${pageTitle.value || 'photos'} on PicHaus`),
    ogImage: computed(() => {
        if (viewMode.value === 'group' && groupAlbums.value.length > 0) {
            return `${origin}/api/v1/album/${groupAlbums.value[0].id}/og-image`
        }
        return albumId.value ? `${origin}/api/v1/album/${albumId.value}/og-image` : null
    }),
    twitterCard: 'summary_large_image',
    twitterImage: computed(() => {
        if (viewMode.value === 'group' && groupAlbums.value.length > 0) {
            return `${origin}/api/v1/album/${groupAlbums.value[0].id}/og-image`
        }
        return albumId.value ? `${origin}/api/v1/album/${albumId.value}/og-image` : null
    }),
})

const { applyTheme, resetTheme } = useAlbumTheme()
const { settings: siteSettings, applyAccent } = useSiteSettings()

// Auto-access if no password (Client-side only)
onMounted(async () => {
    // Restore favorites for current context
    if (currentFavoritesKey.value) {
        const saved = localStorage.getItem(currentFavoritesKey.value)
        if (saved) {
            try {
                const ids: string[] = JSON.parse(saved)
                ids.forEach(id => { favoritesMap[id] = true })
            } catch {}
        }
    }

    if (linkData.value?.data) {
        applyTheme(linkData.value.data.themePreset, linkData.value.data.customTheme, 'full')
    }
    if (isPublicAlbum.value && !isAuthenticated.value) {
        isAuthenticated.value = true
        await fetchPhotos()
    } else if (linkData.value?.data && !linkData.value.data.requiresPassword && !isAuthenticated.value) {
        await handleAccess()
    }
})

const handleAccess = async () => {
    accessing.value = true
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/guest-login', {
            method: 'POST',
            body: {
                token,
                password: password.value,
            }
        })

        if (response.data?.accessToken) {
            setAuthToken(response.data.accessToken)
        }

        const data = response.data
        if (data.type === 'group') {
            groupTitle.value = data.title || groupTitle.value
            groupDescription.value = data.description || groupDescription.value
            ownerName.value = data.ownerName || ownerName.value
            groupAlbums.value = Array.isArray(data.albums) ? data.albums : groupAlbums.value
            showMetadata.value = data.showMetadata !== undefined ? data.showMetadata : showMetadata.value
            if (data.themePreset) applyTheme(data.themePreset, data.customTheme, 'full')
            isAuthenticated.value = true
        } else {
            albumId.value = data.albumId
            albumName.value = data.albumName || albumName.value
            ownerName.value = data.ownerName || ownerName.value
            isAuthenticated.value = true
            await fetchPhotos()
        }
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to access')
        loading.value = false
    } finally {
        accessing.value = false
    }
}

// Open Album from Group
const openAlbum = async (album: any) => {
    albumId.value = album.id
    albumName.value = album.name
    description.value = album.description
    eventDate.value = album.eventDate

    // Reset photos, restore selection for this album
    photos.value = []
    page.value = 1
    hasMore.value = false
    loadFavoritesForContext(album.id)

    viewMode.value = 'album'

    await fetchPhotos()
}

// View all photos from all albums in group
const viewAllGroupPhotos = async () => {
    // Reset photos, restore selection for all-group view
    photos.value = []
    page.value = 1
    hasMore.value = false
    loadFavoritesForContext('all')

    viewMode.value = 'all-group-photos'

    await fetchAllGroupPhotos()
}

// Fetch all photos from all albums in group
const fetchAllGroupPhotos = async () => {
    try {
        loadingPhotos.value = page.value === 1
        loadingMore.value = page.value > 1

        // Fetch photos from all albums in the group
        const allPhotos: Photo[] = []
        const photosMap = new Map<string, Photo>() // To avoid duplicates

        for (const album of groupAlbums.value) {
            try {
                const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${album.id}?page=1&limit=1000&sort=dateTaken&order=asc`)
                if (response.data.photos) {
                    response.data.photos.forEach((photo: Photo) => {
                        if (!photosMap.has(photo.id)) {
                            photosMap.set(photo.id, photo)
                            allPhotos.push(photo)
                        }
                    })
                }
            } catch (err) {
                console.error(`Failed to load photos from album ${album.id}:`, err)
            }
        }

        // Sort all photos by shot time (dateTaken) ascending group-wide
        allPhotos.sort((a, b) => {
            const timeA = a.dateTaken != null ? a.dateTaken : a.createdAt
            const timeB = b.dateTaken != null ? b.dateTaken : b.createdAt
            return timeA - timeB
        })

        photos.value = allPhotos
        hasMore.value = false // Since we fetch all at once
    } catch (err) {
        console.error('Failed to load all group photos:', err)
    } finally {
        loadingPhotos.value = false
    }
}

// Fetch photos after access
const fetchPhotos = async () => {
    try {
        loadingPhotos.value = page.value === 1
        loadingMore.value = page.value > 1

        const photoApiUrl = isPublicAlbum.value
            ? `/api/pub/album/${albumId.value}/photos?page=${page.value}&limit=${limit.value}&sort=dateTaken&order=asc`
            : `/api/v1/album/${albumId.value}?page=${page.value}&limit=${limit.value}&sort=dateTaken&order=asc`
        const response = await $fetch<{ success: boolean; data: any }>(photoApiUrl)

        // Populate photographers from album data (only once)
        if (page.value === 1 && response.data) {
            const photographersMap = new Map()
            const activeUploaders = response.data.filtersData?.uploaders || response.data.uploaders || []
            const ownerId = response.data.ownerId || response.data.owner?.id

            activeUploaders.forEach((u: any) => {
                photographersMap.set(u.id, {
                    id: u.id,
                    name: u.name || 'Unknown',
                    instagram: u.instagram || null,
                    avatar: u.avatar || null,
                    role: u.id === ownerId ? 'Owner' : 'Collaborator'
                })
            })

            if (photographersMap.size === 0 && response.data.owner) {
                const owner = response.data.owner
                photographersMap.set(owner.id, {
                    id: owner.id,
                    name: owner.name || 'Unknown',
                    instagram: owner.instagram || null,
                    avatar: owner.avatar || null,
                    role: 'Owner'
                })
            }

            photographers.value = Array.from(photographersMap.values())
        }

        if (response.data.photos) {
            photos.value = response.data.photos
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        }
    } catch (err) {
        console.error('Failed to load photos:', err)
    } finally {
        loadingPhotos.value = false
    }
}

const loadMorePhotos = async () => {
    if (loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    try {
        const nextPage = page.value + 1
        const loadMoreUrl = isPublicAlbum.value
            ? `/api/pub/album/${albumId.value}/photos`
            : `/api/v1/album/${albumId.value}`
        const response = await $fetch<{ success: boolean; data: any }>(loadMoreUrl, {
            params: { page: nextPage, limit: limit.value, sort: 'dateTaken', order: 'asc' }
        })

        if (response.data.photos && response.data.photos.length > 0) {
            photos.value = [...photos.value, ...response.data.photos]
            page.value = nextPage
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        } else {
            hasMore.value = false
        }
    } catch (err) {
        console.error('Failed to load more photos:', err)
    } finally {
        loadingMore.value = false
    }
}


onUnmounted(() => {
    if (infiniteScrollObserver) infiniteScrollObserver.disconnect()
    resetTheme()
    applyAccent(siteSettings.value.accentColor)
})

// Infinite Scroll
let infiniteScrollObserver: IntersectionObserver | null = null
watch(sentinelRef, (el) => {
    if (infiniteScrollObserver) {
        infiniteScrollObserver.disconnect()
        infiniteScrollObserver = null
    }

    if (el) {
        infiniteScrollObserver = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting && hasMore.value) {
                loadMorePhotos()
            }
        }, { rootMargin: '200px' })
        infiniteScrollObserver.observe(el)
    }
})

// Helpers
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

// Viewer Actions
const openPhotoViewer = (index: number) => {
    selectedPhotoIndex.value = index
}

const closePhotoViewer = () => {
    selectedPhotoIndex.value = null
}

const previousPhoto = () => {
    if (selectedPhotoIndex.value !== null && selectedPhotoIndex.value > 0) {
        selectedPhotoIndex.value--
    }
}

const nextPhoto = () => {
    if (selectedPhotoIndex.value !== null && selectedPhotoIndex.value < photos.value.length - 1) {
        selectedPhotoIndex.value++
    }
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>
