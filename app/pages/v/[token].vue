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
                        <span v-if="ownerName" class="block text-xs mt-1" style="color: var(--text-3);">by {{ ownerName }}</span>
                    </p>
                </div>

                <div v-if="!loading && !error && requiresPassword">
                    <form @submit.prevent="handleAccess" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password Required</label>
                            <input v-model="password" type="password" required placeholder="Enter password"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="$event.target.style.borderColor = 'var(--accent)'; $event.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="$event.target.style.borderColor = 'var(--separator)'; $event.target.style.boxShadow = 'none'" />
                        </div>

                        <button type="submit" :disabled="accessing"
                            class="w-full py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!accessing && ($event.currentTarget.style.background = 'var(--accent-hover)')"
                            @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                            {{ accessing ? 'Accessing…' : 'View Access' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Authenticated Content -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-8">

            <!-- Group View -->
            <div v-if="viewMode === 'group'">
                <div class="text-center mb-12">
                    <h1 class="text-4xl sm:text-5xl font-bold mb-3 tracking-tight" style="color: var(--text-1);">{{ groupTitle }}</h1>
                    <p v-if="groupDescription" class="text-base max-w-2xl mx-auto" style="color: var(--text-2);">{{ groupDescription }}</p>
                    <div class="mt-2 text-sm" style="color: var(--text-3);">Collection by {{ ownerName }}</div>
                    <button @click="viewAllGroupPhotos"
                        class="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold transition inline-flex items-center gap-2"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="$event.currentTarget.style.background = 'var(--accent-hover)'"
                        @mouseout="$event.currentTarget.style.background = 'var(--accent)'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                        </svg>
                        View All Pictures
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div v-for="album in groupAlbums" :key="album.id" @click="openAlbum(album)"
                        class="rounded-2xl overflow-hidden cursor-pointer group transition hover:-translate-y-1"
                        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);"
                        @mouseover="$event.currentTarget.style.boxShadow = 'var(--shadow-md)'"
                        @mouseout="$event.currentTarget.style.boxShadow = 'var(--shadow-sm)'">

                        <div class="aspect-video relative overflow-hidden" style="background: var(--surface-3);">
                            <template v-if="album.coverPhoto">
                                <div v-if="album.coverPhoto.blurhash" class="absolute inset-0 bg-cover bg-center"
                                    :style="{ backgroundImage: `url(${computeBlurhash(album.coverPhoto.blurhash)})` }" />
                                <img :src="buildAssetUrl(`/api/assets/full/${album.coverPhoto.id}`)"
                                    class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    loading="lazy"
                                    @load="$event.target.style.opacity = '1'"
                                    style="opacity: 0;" />
                            </template>
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                </svg>
                            </div>
                        </div>

                        <div class="p-5">
                            <h3 class="text-base font-bold mb-1 truncate" style="color: var(--text-1);">{{ album.name }}</h3>
                            <p v-if="album.description" class="text-sm mb-3 line-clamp-2" style="color: var(--text-2);">{{ album.description }}</p>
                            <div class="flex items-center justify-between text-xs" style="color: var(--text-3);">
                                <span>{{ album.photoCount }} photos</span>
                                <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- All Group Photos View -->
            <div v-else-if="viewMode === 'all-group-photos'">
                <!-- Header -->
                <div
                    class="pt-4 sm:pt-0 mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="text-left md:text-left">
                        <div class="mb-2">
                            <button @click="viewMode = 'group'"
                                class="flex items-center gap-1 text-sm px-3 py-1 rounded-full transition"
                                style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);"
                                @mouseover="$event.currentTarget.style.background = 'var(--surface-3)'"
                                @mouseout="$event.currentTarget.style.background = 'var(--surface-2)'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to {{ groupTitle }}
                            </button>
                        </div>
                        <h1 class="text-4xl sm:text-4xl lg:text-5xl font-bold mb-2 tracking-tight" style="color: var(--text-1);">All Pictures</h1>
                        <div class="text-sm" style="color: var(--text-2);">
                            <span v-if="groupDescription">{{ groupDescription }}</span>
                        </div>
                    </div>

                    <button @click="downloadAllGroupPhotos" :disabled="downloading"
                        class="px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="!downloading && ($event.currentTarget.style.background = 'var(--surface-3)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--surface-2)'">
                        <span>Download All</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
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
                    <h3 class="text-lg sm:text-xl font-bold mb-2" style="color: var(--text-1);">No photos yet</h3>
                </div>

                <!-- Photo Grid -->
                <div v-else-if="picturesLayout" ref="containerRef" class="relative mx-auto"
                    :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                    <div v-for="(photo, index) in photos" :key="photo.id" @click="openPhotoViewer(index)"
                        class="absolute cursor-pointer overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 group"
                        style="background: var(--surface-3);"
                        :style="{
                            top: `${picturesLayout.getPosition(index).top}px`,
                            left: `${picturesLayout.getPosition(index).left}px`,
                            width: `${picturesLayout.getPosition(index).width}px`,
                            height: `${picturesLayout.getPosition(index).height}px`,
                        }">
                        <img v-if="photo.blurhash"
                            :src="getBlurhashUrl(photo.blurhash, photo.width, photo.height) || ''"
                            class="absolute inset-0 w-full h-full object-cover" />
                        <img :src="buildAssetUrl(`/api/assets/thumb/${photo.id}`)" :alt="photo.filename" loading="lazy"
                            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" />
                        <button @click.stop="toggleFavorite(photo.id)"
                            class="absolute bottom-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200"
                            :class="isFavorited(photo.id)
                                ? 'bg-red-500/80 text-white opacity-100'
                                : 'bg-black/40 text-white/60 opacity-100 md:opacity-0 md:group-hover:opacity-100'">
                            <svg v-if="isFavorited(photo.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
                            </svg>
                        </button>
                    </div>
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
                            <button @click="viewMode = 'group'"
                                class="flex items-center gap-1 text-sm px-3 py-1 rounded-full transition"
                                style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);"
                                @mouseover="$event.currentTarget.style.background = 'var(--surface-3)'"
                                @mouseout="$event.currentTarget.style.background = 'var(--surface-2)'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to {{ groupTitle }}
                            </button>
                        </div>
                        <h1 class="text-4xl sm:text-4xl lg:text-5xl font-bold mb-2 tracking-tight" style="color: var(--text-1);">{{ albumName }}</h1>
                        <div class="text-sm" style="color: var(--text-2);">
                            <span v-if="eventDate">{{ formatDate(eventDate) }}</span>
                            <div v-if="description" class="whitespace-pre-line mt-1" style="color: var(--text-3);">{{ description }}</div>
                            <div v-if="photographers.length > 0" class="flex items-center gap-2 mt-2">
                                <span style="color: var(--text-3);">by</span>
                                <button @click="showPhotographersModal = true"
                                    class="transition underline decoration-dotted" style="color: var(--accent);">
                                    {{ photographersDisplay }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button @click="downloadAll" :disabled="downloading"
                        class="px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="!downloading && ($event.currentTarget.style.background = 'var(--surface-3)')"
                        @mouseout="$event.currentTarget.style.background = 'var(--surface-2)'">
                        <span>Download All</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
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
                    <h3 class="text-lg sm:text-xl font-bold mb-2" style="color: var(--text-1);">No photos yet</h3>
                </div>

                <!-- Photo Grid -->
                <div v-else-if="picturesLayout" ref="containerRef" class="relative mx-auto"
                    :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                    <div v-for="(photo, index) in photos" :key="photo.id" @click="openPhotoViewer(index)"
                        class="absolute cursor-pointer overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 group"
                        style="background: var(--surface-3);"
                        :style="{
                            top: `${picturesLayout.getPosition(index).top}px`,
                            left: `${picturesLayout.getPosition(index).left}px`,
                            width: `${picturesLayout.getPosition(index).width}px`,
                            height: `${picturesLayout.getPosition(index).height}px`,
                        }">
                        <img v-if="photo.blurhash"
                            :src="getBlurhashUrl(photo.blurhash, photo.width, photo.height) || ''"
                            class="absolute inset-0 w-full h-full object-cover" />
                        <img :src="buildAssetUrl(`/api/assets/thumb/${photo.id}`)" :alt="photo.filename" loading="lazy"
                            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" />
                        <button @click.stop="toggleFavorite(photo.id)"
                            class="absolute bottom-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200"
                            :class="isFavorited(photo.id)
                                ? 'bg-red-500/80 text-white opacity-100'
                                : 'bg-black/40 text-white/60 opacity-100 md:opacity-0 md:group-hover:opacity-100'">
                            <svg v-if="isFavorited(photo.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
                            </svg>
                        </button>
                    </div>
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
                    <h3 class="text-lg font-bold" style="color: var(--text-1);">Photographers</h3>
                    <button @click="showPhotographersModal = false" class="p-1 rounded-lg transition"
                        style="color: var(--text-3);"
                        @mouseover="$event.currentTarget.style.background = 'var(--surface-2)'"
                        @mouseout="$event.currentTarget.style.background = 'transparent'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="space-y-2">
                    <div v-for="photographer in photographers" :key="photographer.id"
                        class="p-3 rounded-xl" style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1">
                                <p class="font-medium text-sm" style="color: var(--text-1);">{{ photographer.name }}</p>
                                <p v-if="photographer.email" class="text-xs mt-0.5" style="color: var(--text-3);">{{ photographer.email }}</p>
                                <div v-if="photographer.instagram" class="flex items-center gap-2 mt-1">
                                    <span class="text-xs" style="color: var(--text-2);">@{{ photographer.instagram }}</span>
                                    <a :href="`https://instagram.com/${photographer.instagram || ''}`" target="_blank"
                                        rel="noopener noreferrer" style="color: var(--accent);">
                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-xs whitespace-nowrap"
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
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/>
                        </svg>
                        <span class="text-white font-medium text-sm sm:text-base">
                            {{ favorites.size }} {{ favorites.size === 1 ? 'photo' : 'photos' }} selected
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button @click="clearFavorites"
                            class="px-3 py-1.5 text-sm text-white/60 hover:text-white transition rounded-lg hover:bg-white/10">
                            Clear
                        </button>
                        <button @click="downloadFavorites" :disabled="downloading"
                            class="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition"
                            style="background: var(--accent); color: white;">
                            <svg v-if="isIOS" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            {{ isIOS ? 'Share' : 'Download' }}{{ favorites.size > 1 ? ` (${favorites.size})` : '' }}
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
                <h3 class="text-base font-bold mb-4 text-center" style="color: var(--text-1);">Downloading Photos</h3>

                <div class="mb-2 flex justify-between text-sm">
                    <span style="color: var(--text-2);">Progress</span>
                    <span style="color: var(--accent); font-weight: 600;">{{ Math.round((downloadProgress.current / downloadProgress.total) * 100) }}%</span>
                </div>

                <div class="w-full rounded-full h-2 mb-4 overflow-hidden" style="background: var(--surface-3);">
                    <div class="h-full rounded-full transition-all duration-300 ease-out"
                        style="background: var(--accent);"
                        :style="{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }">
                    </div>
                </div>

                <p class="text-center text-xs" style="color: var(--text-3);">
                    {{ downloadProgress.current }} of {{ downloadProgress.total }} files processed
                </p>
            </div>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
            :has-next="selectedPhotoIndex! < (photos.length || 0) - 1" :previous-photo-id="previousPhotoId"
            :next-photo-id="nextPhotoId" :show-metadata="showMetadata"
            :is-favorited="selectedPhoto ? isFavorited(selectedPhoto.id) : false"
            @close="closePhotoViewer" @previous="previousPhoto" @next="nextPhoto"
            @toggle-favorite="selectedPhoto && toggleFavorite(selectedPhoto.id)" />
    </div>
</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { setAuthToken, buildAssetUrl } from '~/utils/auth-client'
import { blurhashToDataUrl } from '~/composables/useBlurhash'

const computeBlurhash = (hash: string) => import.meta.client ? blurhashToDataUrl(hash) : ''

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
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(typeof window !== 'undefined' ? Math.min(1200, window.innerWidth - 32) : 1200)

// Download State
const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })

// Favorites State
const favorites = ref<Set<string>>(new Set())

const isFavorited = (photoId: string) => favorites.value.has(photoId)

const toggleFavorite = (photoId: string) => {
    const s = new Set(favorites.value)
    if (s.has(photoId)) {
        s.delete(photoId)
    } else {
        s.add(photoId)
    }
    favorites.value = s
    localStorage.setItem(`pichaus_favorites_${token}`, JSON.stringify([...s]))
}

const clearFavorites = () => {
    favorites.value = new Set()
    localStorage.removeItem(`pichaus_favorites_${token}`)
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

    try {
        // Fetch all photo URLs
        const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId.value}/download-info`)
        const photosToDownload = response.data

        if (photosToDownload.length === 0) {
            alert('No photos to download')
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const zip = new JSZip()
        const folder = zip.folder(albumName.value || 'album')

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/full/${photo.id}`)
                const blob = await res.blob()
                folder?.file(photo.originalName, blob)
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        })

        await Promise.all(promises)

        // Generate zip
        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, `${albumName.value || 'album'}.zip`)
    } catch (err) {
        console.error('Download all error:', err)
        alert('Failed to download photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

// Download all photos from all group albums
const downloadAllGroupPhotos = async () => {
    if (downloading.value) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: 0 }

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
            alert('No photos to download')
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const zip = new JSZip()
        const groupFolder = zip.folder(groupTitle.value || 'group')

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/full/${photo.id}`)
                const blob = await res.blob()
                
                // Organize by album folder
                const albumFolder = groupFolder?.folder(photo.albumName || 'uncategorized')
                albumFolder?.file(photo.originalName, blob)
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        })

        await Promise.all(promises)

        // Generate zip
        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, `${groupTitle.value || 'group'}-photos.zip`)
    } catch (err) {
        console.error('Download all group photos error:', err)
        alert('Failed to download photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

// Download selected/favorited photos
const downloadFavorites = async () => {
    if (downloading.value || favorites.value.size === 0) return

    const favIds = [...favorites.value]
    const photosToDownload = photos.value.filter(p => favIds.includes(p.id))
    if (photosToDownload.length === 0) return

    const folderName = (viewMode.value === 'album' ? albumName.value : groupTitle.value) || 'photos'

    downloading.value = true
    downloadProgress.value = { current: 0, total: photosToDownload.length }

    try {
        const files: { blob: Blob; name: string }[] = []
        for (const photo of photosToDownload) {
            try {
                const res = await fetch(buildAssetUrl(`/api/assets/full/${photo.id}`))
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
                await navigator.share({ files: shareFiles })
                return
            }
        }

        // All other platforms: zip download
        const zip = new JSZip()
        const folder = zip.folder(folderName)
        files.forEach(f => folder?.file(f.name, f.blob))
        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, `${folderName}-selected.zip`)
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Download favorites error:', err)
            alert('Failed to download photos')
        }
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
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
const { data: linkData, error: linkError } = await useFetch<{ success: boolean; data: any }>(`/api/v1/upload/${token}`)

// Populate state from SSR data
if (linkData.value?.data) {
    const data = linkData.value.data
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

// Auto-access if no password (Client-side only)
onMounted(async () => {
    // Restore favorites from previous session
    const saved = localStorage.getItem(`pichaus_favorites_${token}`)
    if (saved) {
        try { favorites.value = new Set(JSON.parse(saved)) } catch {}
    }

    if (linkData.value?.data) {
        applyTheme(linkData.value.data.themePreset, linkData.value.data.customTheme, 'full')
    }
    if (linkData.value?.data && !linkData.value.data.requiresPassword && !isAuthenticated.value) {
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
        alert(err.data?.statusMessage || 'Failed to access')
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

    // Reset photos
    photos.value = []
    page.value = 1
    hasMore.value = false

    viewMode.value = 'album'

    await fetchPhotos()
}

// View all photos from all albums in group
const viewAllGroupPhotos = async () => {
    // Reset photos
    photos.value = []
    page.value = 1
    hasMore.value = false

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
                const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${album.id}?page=1&limit=1000`)
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

        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId.value}?page=${page.value}&limit=${limit.value}`)

        // Populate photographers from album data (only once)
        if (page.value === 1 && response.data) {
            const photographersMap = new Map()

            // Add owner
            const owner = response.data.owner
            if (owner) {
                photographersMap.set(owner.id, {
                    id: owner.id,
                    name: owner.name || owner.email || 'Unknown',
                    email: owner.email,
                    instagram: owner.instagram || null,
                    role: 'Owner'
                })
            }

            // Add collaborators
            response.data.collaborators?.forEach((collab: any) => {
                const user = collab.user
                if (!photographersMap.has(user.id)) {
                    photographersMap.set(user.id, {
                        id: user.id,
                        name: user.name || user.email || 'Unknown',
                        email: user.email,
                        instagram: user.instagram || null,
                        role: 'Collaborator'
                    })
                }
            })

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
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId.value}`, {
            params: { page: nextPage, limit: limit.value }
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

// Layout Logic
const picturesLayout = computed(() => {
    if (!photos.value.length) return null

    const aspectRatios = new Float32Array(
        photos.value.map(photo => (photo.width || 1) / (photo.height || 1))
    )

    // Responsive row height based on screen size
    const rowHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 120 : 180

    return new JustifiedLayout(aspectRatios, {
        rowHeight,
        rowWidth: containerWidth.value,
        spacing: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 12,
        heightTolerance: 0.1,
    })
})

// Resize Observer
let resizeObserver: ResizeObserver | null = null
watch(containerRef, (el) => {
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }

    if (el) {
        resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    containerWidth.value = entry.contentRect.width
                }
            }
        })
        resizeObserver.observe(el)
    }
})

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect()
    if (infiniteScrollObserver) infiniteScrollObserver.disconnect()
    resetTheme()
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

const getBlurhashUrl = (hash: string | null, width: number | null, height: number | null) => {
    if (!hash || !width || !height) return null
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
