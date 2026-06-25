<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <!-- Navigation Bar -->
        <!-- Navigation Bar -->
        <NavBar v-if="album && (album.permissions.isOwner || album.permissions.canEdit)" :show-back="true"
            back-text="Back to Albums" back-to="/album" :logo-text="album.logoText || undefined"
            :logo-image-url="album.logoImageId ? `/api/assets/logo/${album.logoImageId}` : undefined" />

        <!-- Loading State -->
        <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-12 text-center">
            <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 rounded-full border-2 animate-spin" style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                <p class="text-sm" style="color: var(--text-3);">Loading album…</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="px-4 sm:px-6 lg:px-8 py-12">
            <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p class="text-red-200">{{ error }}</p>
            </div>
        </div>

        <!-- Album Content -->
        <div v-else-if="album" class="px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--text-1);">{{ album.name }}</h1>
                    <div>
                        <span v-if="album.eventDate" class="text-sm" style="color: var(--text-2);">{{ formatDate(album.eventDate) }}</span>
                        <div v-if="album.description" class="text-sm whitespace-pre-line mt-1" style="color: var(--text-2);">{{
                            album.description }}</div>
                        <div v-if="album.tags && album.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                            <span v-for="tag in album.tags" :key="`tag-${tag}`"
                                class="px-2 py-0.5 rounded-full text-xs"
                                style="background: var(--surface-3); color: var(--text-2);">
                                #{{ tag }}
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5 mt-2">
                            <span class="text-xs" style="color: var(--text-3);">by</span>
                            <button @click="showPhotographersModal = true"
                                class="text-xs transition underline decoration-dotted" style="color: var(--text-link);">
                                {{ getPhotographersDisplay }}
                            </button>
                        </div>
                        <span v-if="album.isPublic"
                            class="inline-block mt-2 px-2 py-0.5 rounded-full text-xs"
                            style="background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border);">Public</span>
                    </div>
                </div>

                <div class="flex flex-wrap gap-3 w-full md:w-auto">
                    <!-- Share Button -->
                    <button v-if="album.permissions.isOwner" @click="openShareModal"
                        class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <span>Share</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>

                    <!-- Download All Button -->
                    <button v-if="album.permissions.isOwner || album.permissions.canEdit" @click="downloadAll"
                        :disabled="downloading"
                        class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        <span v-if="downloading">
                            {{ downloadProgress.current }}/{{ downloadProgress.total }}
                        </span>
                        <span v-else>Download All</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>

                    <template v-if="album.permissions.canEdit">
                        <button @click="triggerFileInput"
                            class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap flex items-center justify-center gap-1.5"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload
                        </button>
                        <button @click="showEditModal = true"
                            class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                            Edit Album
                        </button>
                        <button @click="confirmDelete"
                            class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap"
                            style="background: var(--error-bg); color: var(--error-text);">
                            Delete
                        </button>
                    </template>
                </div>
            </div>

            <!-- Upload Section -->
            <div v-if="album.permissions.canEdit" class="mb-8">
                <input type="file" ref="fileInput" multiple accept="image/*" class="hidden"
                    @change="handleFileSelect" />

                <!-- Upload Progress Modal/Panel -->
                <div v-if="showUploadModal"
                    class="mt-4 rounded-xl overflow-hidden"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <div class="p-4 flex justify-between items-center" style="border-bottom: 1px solid var(--separator);">
                        <h3 class="text-sm font-semibold" style="color: var(--text-1);">Upload Queue</h3>
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg" style="background: var(--surface-2); color: var(--text-2);">
                                <span>Concurrent:</span>
                                <input type="number" v-model.number="maxConcurrency" min="1" max="5"
                                    class="w-7 bg-transparent text-center focus:outline-none" style="color: var(--text-1);" />
                            </div>
                            <button v-if="uploadQueue.some(i => i.status === 'failed')" @click="retryFailed"
                                class="text-xs px-2 py-1 rounded-lg transition"
                                style="background: var(--error-bg); color: var(--error-text);">Retry Failed</button>
                            <button @click="clearCompleted"
                                class="text-xs px-2 py-1 rounded-lg transition"
                                style="background: var(--surface-3); color: var(--text-2);">Clear Done</button>
                            <button @click="showUploadModal = false" style="color: var(--text-3);"
                                @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Overall Progress Bar -->
                    <div class="px-4 py-3" style="border-bottom: 1px solid var(--separator);">
                        <div class="flex items-center justify-between text-xs mb-2">
                            <span style="color: var(--text-2);">Overall Progress</span>
                            <span class="font-medium" style="color: var(--text-1);">{{ uploadProgress.completed }}/{{ uploadProgress.total }} ({{ uploadProgress.percentage }}%)</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: var(--surface-3);">
                            <div class="h-full rounded-full transition-all duration-300 ease-out"
                                style="background: var(--accent);"
                                :style="{ width: `${uploadProgress.percentage}%` }"></div>
                        </div>
                    </div>

                    <div class="max-h-60 overflow-y-auto p-2 space-y-1">
                        <div v-for="item in uploadQueue" :key="item.id"
                            class="flex items-center gap-3 p-2 rounded-lg"
                            style="background: var(--surface-2);">
                            <div class="shrink-0 w-5 flex justify-center text-sm">
                                <span v-if="item.status === 'hashing' || item.status === 'checking' || item.status === 'uploading'"
                                    class="w-4 h-4 rounded-full border-2 animate-spin block"
                                    style="border-color: var(--separator); border-top-color: var(--accent);"></span>
                                <span v-else-if="item.status === 'completed'" style="color: var(--success);">✓</span>
                                <span v-else-if="item.status === 'skipped'" style="color: var(--warning);">↷</span>
                                <span v-else-if="item.status === 'failed'" style="color: var(--error);">✕</span>
                                <span v-else style="color: var(--text-3);">•</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm truncate" style="color: var(--text-1);">{{ item.file.name }}</div>
                                <div class="text-xs flex items-center gap-2" style="color: var(--text-3);">
                                    <span class="capitalize">{{ item.status }}</span>
                                    <span v-if="item.error" style="color: var(--error-text);">{{ item.error }}</span>
                                    <span v-if="item.status === 'uploading'" style="color: var(--accent);">{{ item.progress }}%</span>
                                </div>
                                <div v-if="item.status === 'uploading'" class="mt-1 h-1 rounded-full overflow-hidden" style="background: var(--surface-3);">
                                    <div class="h-full rounded-full transition-all duration-300" style="background: var(--accent);"
                                        :style="{ width: `${item.progress}%` }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters Section -->
            <div class="mb-6 rounded-xl p-3" style="background: var(--surface-1); border: 1px solid var(--separator);">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-semibold mr-1" style="color: var(--text-3);">Filter:</span>

                    <select v-model="filters.camera" @change="applyFilters"
                        class="px-3 py-2 text-sm rounded-xl"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                        <option value="">All Cameras</option>
                        <option v-for="camera in availableCameras" :key="camera" :value="camera">{{ camera }}</option>
                    </select>

                    <select v-model="filters.lens" @change="applyFilters"
                        class="px-3 py-2 text-sm rounded-xl"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                        <option value="">All Lenses</option>
                        <option v-for="lens in availableLenses" :key="lens" :value="lens">{{ lens }}</option>
                    </select>

                    <select v-model="filters.photographer" @change="applyFilters"
                        class="px-3 py-2 text-sm rounded-xl"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                        <option value="">All Photographers</option>
                        <option v-for="uploader in availableUploaders" :key="uploader.id" :value="uploader.id">
                            {{ uploader.name || uploader.email }}
                        </option>
                    </select>

                    <button v-if="filters.camera || filters.lens || filters.photographer" @click="clearFilters"
                        class="px-3 py-2 rounded-xl text-sm transition"
                        style="background: var(--surface-3); color: var(--text-2);">
                        Clear Filters
                    </button>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="photos.length === 0 && !uploading" class="text-center py-16 rounded-2xl"
                style="background: var(--surface-1); border: 1px solid var(--separator);">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style="background: var(--surface-3);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                </div>
                <h3 class="text-lg font-semibold mb-1" style="color: var(--text-1);">No photos yet</h3>
                <p class="text-sm mb-5" style="color: var(--text-2);">Upload photos or share this album to collect photos</p>
                <button v-if="album.permissions.isOwner" @click="openShareModal"
                    class="px-5 py-2.5 rounded-full text-sm font-medium transition"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    Share Album
                </button>
            </div>

            <!-- Photo Grid -->
            <div v-else-if="picturesLayout" ref="containerRef" class="relative w-full"
                :style="{ height: `${picturesLayout.containerHeight}px` }">
                <PhotoTile
                    v-for="(photo, index) in photos"
                    :key="photo.id"
                    :photo="photo"
                    :position="picturesLayout.getPosition(index)"
                    :selected="selectedPhotoIds.has(photo.id)"
                    @click.stop="handlePhotoTileClick(index, $event)"
                    @contextmenu="handleContextMenu($event, photo)"
                />
            </div>

            <!-- Selection Action Bar -->
            <div v-if="selectedPhotoIds.size > 0"
                class="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full px-5 py-3 flex items-center gap-4 z-40"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="text-sm font-medium pr-4" style="color: var(--text-1); border-right: 1px solid var(--separator);">
                    {{ selectedPhotoIds.size }} selected
                </div>

                <button @click="clearSelection" class="text-sm transition" style="color: var(--text-2);">Clear</button>

                <div class="h-4 w-px" style="background: var(--separator);"></div>

                <button @click="downloadSelected" :disabled="downloading"
                    class="flex items-center gap-1.5 text-sm font-medium transition" style="color: var(--text-1);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span v-if="downloading">{{ downloadProgress.current }}/{{ downloadProgress.total }}</span>
                    <span v-else>Download</span>
                </button>

                <template v-if="album?.permissions.canEdit">
                    <button v-if="selectedPhotoIds.size === 1" @click="openEditPhotoModal"
                        class="flex items-center gap-1.5 text-sm font-medium transition" style="color: var(--text-1);">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Info
                    </button>

                    <button @click="deleteSelected"
                        class="flex items-center gap-1.5 text-sm font-medium transition" style="color: var(--error-text);">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </template>
            </div>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingPhotos" class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded-full border-2 animate-spin" style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                    <span class="text-xs" style="color: var(--text-3);">Loading more…</span>
                </div>
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
            <div class="flex justify-between items-center mb-5">
                <h3 class="text-xl font-semibold" style="color: var(--text-1);">Photographers</h3>
                <button @click="showPhotographersModal = false" style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="space-y-2">
                <div v-for="photographer in allPhotographers" :key="photographer.id"
                    class="rounded-xl p-3" style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex-1">
                            <p class="text-sm font-medium" style="color: var(--text-1);">{{ photographer.name }}</p>
                            <p v-if="photographer.email" class="text-xs mt-0.5" style="color: var(--text-2);">{{ photographer.email }}</p>
                            <div v-if="photographer.instagram" class="flex items-center gap-2 mt-1">
                                <span class="text-xs" style="color: var(--text-2);">@{{ photographer.instagram }}</span>
                                <a :href="`https://instagram.com/${photographer.instagram || ''}`" target="_blank"
                                    rel="noopener noreferrer" class="text-pink-400 hover:text-pink-300 transition">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                        <span class="px-2 py-1 rounded-full text-xs whitespace-nowrap"
                            style="background: var(--accent-light); color: var(--accent);">
                            {{ photographer.role }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Photo Modal -->
    <div v-if="showEditPhotoModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @click.self="showEditPhotoModal = false">
        <div class="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <h3 class="text-xl font-bold mb-4" style="color: var(--text-1);">Edit Photo Info</h3>

            <form @submit.prevent="handleUpdatePhoto" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Date Taken</label>
                    <input v-model="editPhotoForm.dateTaken" type="datetime-local"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Camera</label>
                        <input v-model="editPhotoForm.cameraModel" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Lens</label>
                        <input v-model="editPhotoForm.lens" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Focal Length</label>
                        <input v-model="editPhotoForm.focalLength" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Aperture</label>
                        <input v-model="editPhotoForm.aperture" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Shutter Speed</label>
                        <input v-model="editPhotoForm.shutterSpeed" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">ISO</label>
                        <input v-model="editPhotoForm.iso" type="number"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                </div>

                <div v-if="editPhotoError" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ editPhotoError }}
                </div>

                <div class="flex gap-3">
                    <button type="button" @click="showEditPhotoModal = false"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Cancel
                    </button>
                    <button type="submit" :disabled="updatingPhoto"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!updatingPhoto && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ updatingPhoto ? 'Updating…' : 'Update' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Crop Album Cover Modal -->
    <div v-if="showCropModal"
        class="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto"
        style="background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);"
        @click.self="cancelCrop">
        <div class="rounded-2xl w-full max-w-3xl my-8 overflow-hidden"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">

            <!-- Header -->
            <div class="flex items-start justify-between p-6 pb-4">
                <div>
                    <h3 class="text-xl font-bold" style="color: var(--text-1);">Set Album Cover</h3>
                    <p class="text-sm mt-1" style="color: var(--text-3);">
                        Drag inside to move &middot; drag corners to resize &middot; locked to 16:9
                    </p>
                </div>
                <button @click="cancelCrop" class="text-3xl leading-none -mt-1 ml-4 transition"
                    style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">&times;</button>
            </div>

            <div v-if="photoCropImage" class="px-6 pb-6 space-y-4">
                <!-- Crop area -->
                <div class="relative bg-black rounded-xl overflow-hidden select-none" style="height: 420px; touch-action: none;">
                    <img
                        ref="cropImageRef"
                        :src="buildAssetUrl(`/api/assets/thumb/${photoCropImage.id}`)"
                        @load="initializeCrop"
                        class="absolute inset-0 w-full h-full block"
                        style="object-fit: contain;"
                        draggable="false"
                    />
                    <canvas
                        ref="cropCanvasRef"
                        class="absolute"
                        style="touch-action: none;"
                        @mousedown="handleCropMouseDown"
                        @mousemove="handleCropMouseMove"
                        @mouseup="handleCropMouseUp"
                        @mouseleave="handleCropMouseUp"
                        @touchstart.prevent="handleCropTouchStart"
                        @touchmove.prevent="handleCropTouchMove"
                        @touchend.prevent="handleCropTouchEnd"
                    ></canvas>
                </div>

                <!-- Info row with Reset -->
                <div class="flex items-center justify-between text-xs py-1">
                    <div class="font-mono" style="color: var(--text-3);">
                        Crop Area: {{ Math.round(cropArea.width) }} &times; {{ Math.round(cropArea.height) }} px
                    </div>
                    <button type="button" @click="resetCrop"
                        class="transition underline" style="color: var(--accent);">
                        Reset Selection
                    </button>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 pt-1">
                    <button type="button" @click="cancelCrop"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Cancel
                    </button>
                    <button type="button" @click="confirmCrop" :disabled="croppingCover"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!croppingCover && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ croppingCover ? 'Saving…' : 'Set as Cover' }}
                    </button>
                </div>
            </div>

            <div v-else class="flex justify-center items-center h-48">
                <div class="animate-spin rounded-full h-8 w-8 border-2"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
            </div>
        </div>
    </div>

    <!-- Edit Album Modal -->
    <div v-if="showEditModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @click.self="showEditModal = false; applyTheme(album?.themePreset, album?.customTheme)">
        <div class="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <h3 class="text-xl font-bold mb-4" style="color: var(--text-1);">Edit Album</h3>

            <form @submit.prevent="handleUpdateAlbum" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Album Name *</label>
                    <input v-model="editForm.name" type="text" required
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Description</label>
                    <textarea v-model="editForm.description" rows="3"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Tags</label>
                    <input v-model="editForm.tags" type="text"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="wedding, portrait, night"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    <p class="text-xs mt-1" style="color: var(--text-3);">Separate tags with commas</p>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Event Date</label>
                    <input v-model="editForm.eventDate" type="date"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <div class="flex items-center gap-2">
                    <input v-model="editForm.isPublic" type="checkbox" id="editIsPublic"
                        class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                    <label for="editIsPublic" class="text-sm" style="color: var(--text-2);">Make album public</label>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2" style="color: var(--text-2);">Color Theme</label>
                    <div class="grid grid-cols-4 gap-2">
                        <button v-for="(theme, key) in ALBUM_THEMES" :key="key"
                            type="button"
                            @click="editForm.themePreset = key"
                            :class="[
                                'relative rounded-xl h-12 border-2 transition overflow-hidden',
                                editForm.themePreset === key ? 'border-[var(--accent)] ring-2 ring-[var(--accent-light)]' : 'border-transparent hover:border-[var(--separator)]'
                            ]"
                            :style="{ background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})` }"
                            :title="theme.label">
                            <span class="absolute bottom-0.5 left-0 right-0 text-center text-white text-[9px] font-semibold drop-shadow-sm">{{ theme.label }}</span>
                            <span v-if="editForm.themePreset === key" class="absolute top-0.5 right-0.5 text-white text-[10px] leading-none">✓</span>
                        </button>
                        <!-- Custom swatch -->
                        <button type="button"
                            @click="editForm.themePreset = 'custom'"
                            :class="[
                                'relative rounded-xl h-12 border-2 transition overflow-hidden',
                                editForm.themePreset === 'custom' ? 'border-[var(--accent)] ring-2 ring-[var(--accent-light)]' : 'border-transparent hover:border-[var(--separator)]'
                            ]"
                            :style="{ background: `linear-gradient(135deg, ${editForm.customTheme.bgStart}, ${editForm.customTheme.bgEnd})` }"
                            title="Custom">
                            <span class="absolute bottom-0.5 left-0 right-0 text-center text-white text-[9px] font-semibold drop-shadow-sm">Custom</span>
                            <span v-if="editForm.themePreset === 'custom'" class="absolute top-0.5 right-0.5 text-white text-[10px] leading-none">✓</span>
                        </button>
                    </div>

                    <!-- Custom color pickers -->
                    <div v-if="editForm.themePreset === 'custom'" class="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs mb-1" style="color: var(--text-3);">Background Start</label>
                            <div class="flex items-center gap-2">
                                <input type="color" v-model="editForm.customTheme.bgStart"
                                    class="w-8 h-8 rounded cursor-pointer bg-transparent"
                                    style="border: 1px solid var(--separator);" />
                                <input type="text" v-model="editForm.customTheme.bgStart"
                                    class="flex-1 px-2 py-1 text-xs rounded-lg transition"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;" />
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs mb-1" style="color: var(--text-3);">Background End</label>
                            <div class="flex items-center gap-2">
                                <input type="color" v-model="editForm.customTheme.bgEnd"
                                    class="w-8 h-8 rounded cursor-pointer bg-transparent"
                                    style="border: 1px solid var(--separator);" />
                                <input type="text" v-model="editForm.customTheme.bgEnd"
                                    class="flex-1 px-2 py-1 text-xs rounded-lg transition"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;" />
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs mb-1" style="color: var(--text-3);">Accent Start</label>
                            <div class="flex items-center gap-2">
                                <input type="color" v-model="editForm.customTheme.btnStart"
                                    class="w-8 h-8 rounded cursor-pointer bg-transparent"
                                    style="border: 1px solid var(--separator);" />
                                <input type="text" v-model="editForm.customTheme.btnStart"
                                    class="flex-1 px-2 py-1 text-xs rounded-lg transition"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;" />
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs mb-1" style="color: var(--text-3);">Accent End</label>
                            <div class="flex items-center gap-2">
                                <input type="color" v-model="editForm.customTheme.btnEnd"
                                    class="w-8 h-8 rounded cursor-pointer bg-transparent"
                                    style="border: 1px solid var(--separator);" />
                                <input type="text" v-model="editForm.customTheme.btnEnd"
                                    class="flex-1 px-2 py-1 text-xs rounded-lg transition"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;" />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Event Branding</label>
                    <input v-model="editForm.logoText" type="text"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="e.g. TNI Open Day 2026"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    <p class="text-xs mt-1" style="color: var(--text-3);">Text shown in the header (used when no logo image is set)</p>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Logo Image</label>
                    <div class="flex items-center gap-2 mb-2">
                        <button type="button" :disabled="logoUploading"
                            @click="logoFileInput?.click()"
                            class="px-3 py-1.5 text-sm rounded-full transition disabled:opacity-50"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                            {{ logoUploading ? 'Uploading…' : 'Upload logo' }}
                        </button>
                        <button v-if="editForm.logoImageId" type="button"
                            @click="editForm.logoImageId = null"
                            class="px-3 py-1.5 text-sm rounded-full transition"
                            style="background: var(--surface-2); color: var(--text-3); border: 1px solid var(--separator);">
                            Clear
                        </button>
                        <input ref="logoFileInput" type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
                    </div>
                    <div v-if="availableLogos.length > 0" class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                        <button v-for="logo in availableLogos" :key="logo.id" type="button"
                            @click="editForm.logoImageId = editForm.logoImageId === logo.id ? null : logo.id"
                            :class="[
                                'relative rounded-xl border-2 overflow-hidden transition aspect-square flex items-center justify-center p-1',
                                editForm.logoImageId === logo.id ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--separator)]'
                            ]"
                            :style="{ background: 'var(--surface-2)' }"
                            :title="logo.originalName">
                            <img :src="logo.url" :alt="logo.originalName" class="max-h-full max-w-full object-contain" />
                            <span v-if="editForm.logoImageId === logo.id" class="absolute top-0.5 right-0.5 text-[10px] leading-none" style="color: var(--accent);">✓</span>
                        </button>
                    </div>
                    <p v-else class="text-xs" style="color: var(--text-3);">No logos uploaded yet — upload one above.</p>
                    <p class="text-xs mt-1" style="color: var(--text-3);">Logo images replace the text branding in the header.</p>
                </div>

                <div v-if="editError" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ editError }}
                </div>

                <div class="flex gap-3">
                    <button type="button" @click="showEditModal = false; applyTheme(album?.themePreset, album?.customTheme)"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Cancel
                    </button>
                    <button type="submit" :disabled="updating"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!updating && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ updating ? 'Updating…' : 'Update' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @click.self="showShareModal = false">
        <div class="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold" style="color: var(--text-1);">Share Album</h3>
                <button @click="showShareModal = false" class="transition"
                    style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Create/Edit Link -->
            <div class="rounded-2xl p-4 mb-6"
                :style="isEditing ? 'background: var(--accent-light); border: 1px solid var(--accent);' : 'background: var(--surface-2); border: 1px solid var(--separator);'">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-base font-semibold" style="color: var(--text-1);">{{ isEditing ? 'Edit Link' : 'Create New Link' }}</h4>
                    <button v-if="isEditing" @click="cancelEditing"
                        class="text-xs transition" style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">Cancel Edit</button>
                </div>
                <form @submit.prevent="isEditing ? updateShareLink() : createShareLink()" class="space-y-3">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Type</label>
                            <select v-model="newLink.type" :disabled="isEditing"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                                style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                                <option value="view">View Only</option>
                                <option value="upload">Allow Uploads</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Label (Optional)</label>
                            <input v-model="newLink.label" type="text" placeholder="e.g. Family Group"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password (Optional)</label>
                        <div v-if="isEditing && newLink.password === ''" class="text-xs mb-1" style="color: var(--text-3);">
                            Current password will be kept. Enter new one to change, or clear checkbox to remove.
                        </div>
                        <input v-model="newLink.password" type="password"
                            :placeholder="isEditing ? 'Leave empty to keep current password' : 'Leave empty for no password'"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />

                        <div v-if="isEditing && editingLinkHasPassword" class="mt-2 flex items-center gap-2">
                            <input v-model="removePassword" type="checkbox" id="removePassword"
                                class="w-4 h-4 rounded" style="accent-color: var(--error);" />
                            <label for="removePassword" class="text-sm" style="color: var(--error-text);">Remove Password</label>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-3">
                            <input v-model="newLink.showMetadata" type="checkbox" id="showMetadata"
                                class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <label for="showMetadata" class="text-sm" style="color: var(--text-2);">Show photo metadata (date, camera, etc.)</label>
                        </div>
                    </div>
                    <button type="submit" :disabled="creatingLink || updatingLink"
                        class="w-full px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!(creatingLink || updatingLink) && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ isEditing ? (updatingLink ? 'Updating…' : 'Update Link') : (creatingLink ? 'Creating…' : 'Create Link') }}
                    </button>
                </form>
            </div>

            <!-- Existing Links -->
            <div>
                <h4 class="text-base font-semibold mb-4" style="color: var(--text-1);">Active Links</h4>
                <div v-if="loadingLinks" class="text-center py-4 text-sm" style="color: var(--text-3);">Loading links…</div>
                <div v-else-if="shareLinks.length === 0" class="text-center py-4 text-sm" style="color: var(--text-3);">
                    No active share links.
                </div>
                <div v-else class="space-y-3">
                    <div v-for="link in shareLinks" :key="link.id"
                        class="rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <span class="font-medium text-sm" style="color: var(--text-1);">{{ link.label || 'Untitled Link' }}</span>
                                <span :style="link.type === 'view' ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--success-bg); color: var(--success-text);'"
                                    class="px-2 py-0.5 rounded-full text-xs font-medium uppercase">
                                    {{ link.type }}
                                </span>
                                <span v-if="link.password" class="text-xs px-2 py-0.5 rounded-full"
                                    style="background: var(--warning-bg); color: var(--warning-text);">
                                    Password
                                </span>
                                <span v-if="!link.showMetadata" class="text-xs px-2 py-0.5 rounded-full"
                                    style="background: var(--surface-3); color: var(--text-3);">
                                    No Metadata
                                </span>
                            </div>
                            <div class="flex items-center gap-2 text-sm">
                                <button @click="copyLink(link)"
                                    class="truncate max-w-[200px] transition underline decoration-dotted text-sm"
                                    style="color: var(--text-3);"
                                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--accent)'"
                                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                                    {{ getShareUrl(link) }}
                                </button>
                                <button @click="copyLink(link)"
                                    class="px-2 py-1 rounded-full transition text-xs font-medium"
                                    :style="link.copied ? 'background: var(--success-bg); color: var(--success-text);' : 'background: var(--accent-light); color: var(--accent);'">
                                    {{ link.copied ? '✓ Copied!' : 'Copy' }}
                                </button>
                            </div>
                            <div class="text-xs mt-1" style="color: var(--text-3);">
                                Created {{ formatDate(link.createdAt) }} • {{ link.views }} views
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button @click="showQr(link)" title="Show QR code"
                                class="p-2 rounded-lg transition"
                                style="color: var(--text-2);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 0h2v2h-2v-2z" />
                                </svg>
                            </button>
                            <button @click="startEditing(link)"
                                class="p-2 rounded-lg transition"
                                style="color: var(--text-2);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            <button @click="deleteLink(link.id)"
                                class="p-2 rounded-lg transition"
                                style="color: var(--error);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

        <!-- QR Code Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div v-if="qrLinkId" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    style="background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);"
                    @click.self="closeQr">
                    <div class="rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
                        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                        <div class="w-full flex justify-between items-center">
                            <span class="font-semibold truncate text-sm" style="color: var(--text-1);">{{ qrLink?.label || 'Share Link' }}</span>
                            <button @click="closeQr" class="transition"
                                style="color: var(--text-3);"
                                @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <canvas ref="qrCanvasRef" class="rounded-xl"
                            style="border: 1px solid var(--separator);" />
                        <p class="text-xs text-center break-all" style="color: var(--text-3);">{{ qrLink ? getShareUrl(qrLink) : '' }}</p>
                        <button v-if="qrLink" @click="copyLink(qrLink); closeQr()"
                            class="w-full py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--accent-light); color: var(--accent);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'; ($event.currentTarget as HTMLElement).style.color = 'var(--accent-text)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent-light)'; ($event.currentTarget as HTMLElement).style.color = 'var(--accent)'">
                            Copy link
                        </button>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Context Menu -->
        <div v-if="contextMenu.visible"
            class="fixed z-50 rounded-xl py-1 w-48"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-lg);"
            :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">

            <button @click="toggleSelection(contextMenu.photo!.id); closeContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                style="color: var(--text-1); width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
                        v-if="selectedPhotoIds.has(contextMenu.photo!.id)" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" v-else />
                </svg>
                {{ selectedPhotoIds.has(contextMenu.photo!.id) ? 'Deselect' : 'Select' }}
            </button>

            <button @click="downloadPhoto(contextMenu.photo!); closeContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                style="color: var(--text-1); width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
            </button>

            <template v-if="album?.permissions.canEdit">
                <div class="h-px my-1 mx-3" style="background: var(--separator);"></div>

                <button @click="setAsCover(contextMenu.photo!); closeContextMenu()"
                    class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                    style="color: var(--text-1); width: calc(100% - 8px);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Set as Album Cover
                </button>

                <button @click="openEditPhotoModalFromMenu(contextMenu.photo!); closeContextMenu()"
                    class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                    style="color: var(--text-1); width: calc(100% - 8px);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Info
                </button>

                <button @click="deletePhoto(contextMenu.photo!.id); closeContextMenu()"
                    class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                    style="color: var(--error); width: calc(100% - 8px);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </template>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
            :has-next="selectedPhotoIndex! < (photos.length || 0) - 1 || hasMore" :previous-photo-id="previousPhotoId"
            :next-photo-id="nextPhotoId" @close="closePhotoViewer" @previous="previousPhoto" @next="nextPhoto" />

        <!-- Toast Notifications -->
        <div class="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
            <TransitionGroup enter-active-class="transition duration-300 ease-out"
                enter-from-class="transform translate-y-2 opacity-0"
                enter-to-class="transform translate-y-0 opacity-100"
                leave-active-class="transition duration-200 ease-in"
                leave-from-class="transform translate-y-0 opacity-100"
                leave-to-class="transform translate-y-2 opacity-0">
                <div v-for="toast in toasts" :key="toast.id"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium pointer-events-auto"
                    :style="toast.type === 'success'
                        ? 'background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success-text); box-shadow: var(--shadow-md);'
                        : toast.type === 'error'
                        ? 'background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text); box-shadow: var(--shadow-md);'
                        : 'background: var(--accent-light); border: 1px solid var(--accent); color: var(--accent); box-shadow: var(--shadow-md);'">
                    <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ toast.message }}</span>
                </div>
            </TransitionGroup>
        </div>

        <!-- Full-screen Drag-to-Upload Overlay -->
        <Teleport to="body">
            <Transition name="fade">
                <div v-if="isDragging"
                    class="fixed inset-0 z-[9999] flex items-center justify-center"
                    style="background: rgba(0,0,0,0.6);">
                    <div class="text-center pointer-events-none">
                        <div class="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center"
                            style="background: var(--accent-light); border: 2px dashed var(--accent);">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" style="color: var(--accent);">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <p class="text-xl font-semibold text-white">Drop photos to upload</p>
                        <p class="text-sm mt-1 text-white/60">Release to add to this album</p>
                    </div>
                </div>
            </Transition>
        </Teleport>

</template>

<script setup lang="ts">
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { clearAuthToken, buildAssetUrl, getAuthToken } from '~/utils/auth-client'
import { calculateSHA256 } from '~/utils/hash'

interface User {
    id: string
    name: string | null
    email: string | null
    instagram: string | null
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

interface UploadItem {
    id: string
    file: File
    status: 'hashing' | 'checking' | 'pending' | 'uploading' | 'completed' | 'failed' | 'skipped'
    error?: string
    progress?: number
}

interface Collaborator {
    id: string
    role: string
    user: {
        id: string
        name: string | null
        email: string | null
    }
    createdAt: number
}

interface Permissions {
    isOwner: boolean
    isCollaborator: boolean
    canEdit: boolean
    canDelete: boolean
}

interface Album {
    id: string
    name: string
    description: string | null
    tags: string[]
    eventDate: number | null
    isPublic: boolean
    themePreset: string | null
    customTheme: string | null
    logoText: string | null
    logoImageId: string | null
    owner: User
    photos: Photo[]
    collaborators: Collaborator[]
    _count: {
        photos: number
        collaborators: number
    }
    permissions: Permissions
    pagination?: {
        page: number
        limit: number
        total: number
        hasMore: boolean
    }
}

interface ShareLink {
    id: string
    token: string
    type: 'view' | 'upload'
    label: string | null
    password: boolean // Backend returns boolean if password exists
    showMetadata: boolean
    views: number
    createdAt: number
    copied?: boolean
}

const route = useRoute()
const albumId = route.params.id as string

const user = ref<User | null>(null)
const album = ref<Album | null>(null)
const loading = ref(true)
const error = ref('')

// Pagination state
const page = ref(1)
const limit = ref(50)
const hasMore = ref(false)
const loadingPhotos = ref(false)
const photos = ref<Photo[]>([])
const sentinelRef = ref<HTMLElement | null>(null)

// Filter state
const filters = ref({
    camera: '',
    lens: '',
    photographer: ''
})

// Toasts
interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}
const toasts = ref<Toast[]>([])

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7)
    toasts.value.push({ id, message, type })
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }, 3000)
}

// Computed: Get unique cameras from all photos
const availableCameras = computed(() => {
    const cameras = photos.value
        .map(p => p.cameraModel)
        .filter((c): c is string => c != null && c !== '')
    return Array.from(new Set(cameras)).sort()
})

// Computed: Get unique lenses from all photos
const availableLenses = computed(() => {
    const lenses = photos.value
        .map(p => p.lens)
        .filter((l): l is string => l != null && l !== '')
    return Array.from(new Set(lenses)).sort()
})

// Computed: Get unique uploaders from all photos
const availableUploaders = computed(() => {
    const uploaderMap = new Map()
    photos.value.forEach(photo => {
        if (photo.uploader) {
            uploaderMap.set(photo.uploader.id, photo.uploader)
        }
    })
    return Array.from(uploaderMap.values()).sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
    )
})

const applyFilters = async () => {
    page.value = 1
    photos.value = []
    await fetchAlbum()
}

const clearFilters = () => {
    filters.value = {
        camera: '',
        lens: '',
        photographer: ''
    }
    applyFilters()
}

// Photographers modal
const showPhotographersModal = ref(false)

// Computed: Get all unique photographers (owner + collaborators + uploaders)
const allPhotographers = computed(() => {
    if (!album.value) return []

    const photographersMap = new Map()

    // Add owner
    const owner = album.value.owner
    photographersMap.set(owner.id, {
        id: owner.id,
        name: owner.name || owner.email || 'Unknown',
        email: owner.email,
        instagram: owner.instagram,
        role: 'Owner'
    })

    // Add collaborators
    album.value.collaborators?.forEach(collab => {
        const user = collab.user
        // Skip if already added (e.g., owner who is also a collaborator)
        if (!photographersMap.has(user.id)) {
            photographersMap.set(user.id, {
                id: user.id,
                name: user.name || user.email || 'Unknown',
                email: user.email,
                instagram: ('instagram' in user) ? user.instagram : null,
                role: 'Collaborator'
            })
        }
    })

    // Add uploaders from photos
    photos.value.forEach(photo => {
        if (photo.uploader && !photographersMap.has(photo.uploader.id)) {
            photographersMap.set(photo.uploader.id, {
                id: photo.uploader.id,
                name: photo.uploader.name || 'Unknown',
                email: null,
                instagram: (photo.uploader as any).instagram || null,
                role: 'Contributor'
            })
        }
    })

    return Array.from(photographersMap.values())
})

// Computed: Display text for photographers (first names only)
const getPhotographersDisplay = computed(() => {
    return allPhotographers.value
        .map(p => p.name.split(' ')[0]) // Get first name only
        .join(', ')
})

const { applyTheme, resetTheme, ALBUM_THEMES } = useAlbumTheme()
const { settings: siteSettings, applyAccent } = useSiteSettings()

const showEditModal = ref(false)
const editForm = ref({
    name: '',
    description: '',
    tags: '',
    eventDate: '',
    isPublic: false,
    themePreset: 'default' as string,
    customTheme: { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' },
    logoText: '',
    logoImageId: null as string | null,
})
const updating = ref(false)
const editError = ref('')

const availableLogos = ref<{ id: string; originalName: string; url: string }[]>([])
const logoUploading = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

const fetchLogos = async () => {
    try {
        const res = await $fetch<{ success: boolean; data: any[] }>('/api/v1/logos')
        availableLogos.value = res.data
    } catch { /* non-critical */ }
}

const handleLogoUpload = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    logoUploading.value = true
    try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await $fetch<{ success: boolean; data: any }>('/api/v1/logos', { method: 'POST', body: fd })
        availableLogos.value.unshift(res.data)
        editForm.value.logoImageId = res.data.id
    } catch (err: any) {
        editError.value = err.data?.statusMessage || 'Failed to upload logo'
    } finally {
        logoUploading.value = false
        if (logoFileInput.value) logoFileInput.value.value = ''
    }
}

watch(showEditModal, (open) => {
    if (open) {
        fetchLogos()
        // Re-sync editForm theme fields from current album state so stale previews
        // from a previous open don't persist and cause accidental wrong-theme saves.
        if (album.value) {
            let parsedCustomTheme = { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' }
            if (album.value.customTheme) {
                try { parsedCustomTheme = JSON.parse(album.value.customTheme) } catch { /* use defaults */ }
            }
            editForm.value.themePreset = album.value.themePreset ?? 'default'
            editForm.value.customTheme = parsedCustomTheme
        }
    }
})

watch(
    [() => editForm.value.themePreset, () => editForm.value.customTheme],
    ([preset, custom]) => {
        if (showEditModal.value) applyTheme(preset, custom)
    },
    { deep: true },
)

const showEditPhotoModal = ref(false)
const editPhotoForm = ref({
    id: '',
    dateTaken: '',
    cameraModel: '',
    lens: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    iso: null as number | null,
})
const updatingPhoto = ref(false)
const editPhotoError = ref('')

const showCropModal = ref(false)
const photoCropImage = ref<Photo | null>(null)
const cropCanvasRef = ref<HTMLCanvasElement | null>(null)
const cropImageRef = ref<HTMLImageElement | null>(null)
const cropArea = ref({ x: 0, y: 0, width: 0, height: 0 })
const croppingCover = ref(false)
const COVER_CROP_RATIO = 16 / 9

type CropDragMode = 'none' | 'move' | 'new' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
const cropDragMode = ref<CropDragMode>('none')
const cropDragOrigin = ref({ x: 0, y: 0 })
const cropDragSnapshot = ref({ x: 0, y: 0, width: 0, height: 0 })
const CROP_HANDLE = 14

const clampCropToImage = (x: number, y: number, width: number, height: number, W: number, H: number) => {
    const w = Math.max(Math.min(width, W), 0)
    let h = w / COVER_CROP_RATIO
    if (h > H) { h = Math.min(height, H); return { x: Math.max(0, Math.min(x, W - h * COVER_CROP_RATIO)), y: Math.max(0, Math.min(y, H - h)), width: h * COVER_CROP_RATIO, height: h } }
    return { x: Math.max(0, Math.min(x, W - w)), y: Math.max(0, Math.min(y, H - h)), width: w, height: h }
}

let cachedLayout: { scale: number; left: number; top: number; width: number; height: number } | null = null
let cachedCanvasRect: DOMRect | null = null

// Returns scale and pixel offset of the image inside its object-fit:contain container
const getCropImageLayout = (force = false) => {
    if (!force && cachedLayout) return cachedLayout
    const img = cropImageRef.value
    const canvas = cropCanvasRef.value
    if (!img || !canvas) return null
    const cw = img.parentElement!.offsetWidth
    const ch = img.parentElement!.offsetHeight
    const origW = photoCropImage.value?.width || img.naturalWidth
    const origH = photoCropImage.value?.height || img.naturalHeight
    const naturalRatio = origW / origH
    const containerRatio = cw / ch
    let iw: number, ih: number, il: number, it: number
    if (naturalRatio > containerRatio) {
        iw = cw; ih = cw / naturalRatio; il = 0; it = (ch - ih) / 2
    } else {
        ih = ch; iw = ch * naturalRatio; il = (cw - iw) / 2; it = 0
    }
    cachedLayout = { scale: iw / origW, left: il, top: it, width: iw, height: ih }
    return cachedLayout
}

const syncCanvas = () => {
    const layout = getCropImageLayout(true)
    const canvas = cropCanvasRef.value
    if (!layout || !canvas) return
    canvas.width = Math.round(layout.width)
    canvas.height = Math.round(layout.height)
    canvas.style.left = layout.left + 'px'
    canvas.style.top = layout.top + 'px'
    canvas.style.width = layout.width + 'px'
    canvas.style.height = layout.height + 'px'
    
    // Cache the bounding rect of the canvas as well
    cachedCanvasRect = canvas.getBoundingClientRect()
    
    return layout
}

const cropCanvasPoint = (e: { clientX: number; clientY: number }) => {
    const canvas = cropCanvasRef.value
    if (!canvas) return { x: 0, y: 0 }
    if (!cachedCanvasRect) {
        cachedCanvasRect = canvas.getBoundingClientRect()
    }
    return { x: e.clientX - cachedCanvasRect.left, y: e.clientY - cachedCanvasRect.top }
}

const cropHitTest = (cx: number, cy: number): CropDragMode => {
    const layout = getCropImageLayout()
    if (!layout) return 'new'
    const { scale } = layout
    const { x, y, width, height } = cropArea.value
    const sx = x * scale, sy = y * scale, sw = width * scale, sh = height * scale
    const r = CROP_HANDLE
    if (Math.abs(cx - sx) < r && Math.abs(cy - sy) < r) return 'resize-tl'
    if (Math.abs(cx - (sx + sw)) < r && Math.abs(cy - sy) < r) return 'resize-tr'
    if (Math.abs(cx - sx) < r && Math.abs(cy - (sy + sh)) < r) return 'resize-bl'
    if (Math.abs(cx - (sx + sw)) < r && Math.abs(cy - (sy + sh)) < r) return 'resize-br'
    if (cx > sx && cx < sx + sw && cy > sy && cy < sy + sh) return 'move'
    return 'new'
}

const handleCropWindowResize = () => {
    cachedLayout = null
    cachedCanvasRect = null
    syncCanvas()
    drawCropOverlay()
}

watch(showCropModal, (val) => {
    if (val) {
        window.addEventListener('resize', handleCropWindowResize)
        window.addEventListener('scroll', handleCropWindowResize, true)
    } else {
        window.removeEventListener('resize', handleCropWindowResize)
        window.removeEventListener('scroll', handleCropWindowResize, true)
        cachedLayout = null
        cachedCanvasRect = null
    }
})

const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadQueue = ref<UploadItem[]>([])
const isProcessingQueue = ref(false)
const showUploadModal = ref(false)
const isDragging = ref(false)
let dragEnterCounter = 0

const uploadProgress = computed(() => {
    const total = uploadQueue.value.length
    if (total === 0) return { completed: 0, total: 0, percentage: 0 }

    // Calculate effective progress based on bytes/percentage of each file
    const totalProgress = uploadQueue.value.reduce((sum, item) => {
        // Checking/Hashing counts as 0% for file progress, finished is 100%
        // We use the item.progress (0-100)
        return sum + (item.progress || 0)
    }, 0)

    const completed = uploadQueue.value.filter(i => i.status === 'completed' || i.status === 'skipped' || i.status === 'failed').length

    return {
        completed,
        total,
        percentage: Math.round(totalProgress / total)
    }
})

const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })

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


// Multi-select State
const selectedPhotoIds = ref(new Set<string>())
const lastSelectedId = ref<string | null>(null)

const toggleSelection = (id: string) => {
    if (selectedPhotoIds.value.has(id)) {
        selectedPhotoIds.value.delete(id)
    } else {
        selectedPhotoIds.value.add(id)
    }
}

const selectAll = () => {
    photos.value.forEach(p => selectedPhotoIds.value.add(p.id))
}

const clearSelection = () => {
    selectedPhotoIds.value.clear()
    lastSelectedId.value = null
}

// Keyboard Shortcuts
const handleKeydown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + A to select all
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

        e.preventDefault()
        selectAll()
    }
    // Esc to clear selection
    if (e.key === 'Escape') {
        clearSelection()
    }
    // Delete/Backspace to delete selected
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPhotoIds.value.size > 0 && album.value?.permissions.canEdit) {
        deleteSelected()
    }
}

// Context Menu State
const contextMenu = ref({
    visible: false,
    x: 0,
    y: 0,
    photo: null as Photo | null
})

const handleContextMenu = (event: MouseEvent, photo: Photo) => {
    contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        photo
    }
}

const closeContextMenu = () => {
    contextMenu.value.visible = false
}

const onWindowDragEnter = (e: DragEvent) => {
    if (!album.value?.permissions.canEdit) return
    if (!e.dataTransfer?.types?.includes('Files')) return
    dragEnterCounter++
    isDragging.value = true
}

const onWindowDragLeave = () => {
    dragEnterCounter--
    if (dragEnterCounter <= 0) {
        dragEnterCounter = 0
        isDragging.value = false
    }
}

const onWindowDragOver = (e: DragEvent) => e.preventDefault()

const onWindowDrop = (e: DragEvent) => {
    e.preventDefault()
    dragEnterCounter = 0
    isDragging.value = false
    if (album.value?.permissions.canEdit) handleDrop(e)
}

// Close context menu on click outside
onMounted(() => {
    window.addEventListener('click', closeContextMenu)
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('dragenter', onWindowDragEnter)
    window.addEventListener('dragleave', onWindowDragLeave)
    window.addEventListener('dragover', onWindowDragOver)
    window.addEventListener('drop', onWindowDrop)
})

onUnmounted(() => {
    window.removeEventListener('click', closeContextMenu)
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('dragenter', onWindowDragEnter)
    window.removeEventListener('dragleave', onWindowDragLeave)
    window.removeEventListener('dragover', onWindowDragOver)
    window.removeEventListener('drop', onWindowDrop)
    window.removeEventListener('resize', handleCropWindowResize)
    window.removeEventListener('scroll', handleCropWindowResize, true)
})

// Bulk Actions
const downloadSelected = async () => {
    if (downloading.value || selectedPhotoIds.value.size === 0) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: selectedPhotoIds.value.size }

    try {
        const zip = new JSZip()
        const folder = zip.folder(album.value?.name || 'photos')
        const selectedPhotos = photos.value.filter(p => selectedPhotoIds.value.has(p.id))

        await Promise.all(selectedPhotos.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/full/${photo.id}`)
                const blob = await res.blob()
                folder?.file(photo.originalName, blob)
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        }))

        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, `${album.value?.name || 'album'}-selected.zip`)
    } catch (err) {
        console.error('Download selected error:', err)
        alert('Failed to download selected photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

const deleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.value.size} photos?`)) return

    try {
        const ids = Array.from(selectedPhotoIds.value)
        await $fetch(`/api/v1/album/${albumId}/photos/batch-delete`, {
            method: 'POST',
            body: { ids }
        })

        // Remove from local state
        photos.value = photos.value.filter(p => !selectedPhotoIds.value.has(p.id))
        clearSelection()

        // Refresh album to update counts
        await fetchAlbum()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete photos')
    }
}
useSeoMeta({
    title: computed(() => album.value?.name ? `${album.value.name} | PicHaus` : 'PicHaus'),
    ogTitle: computed(() => album.value?.name),
    description: computed(() => album.value?.description || `View ${album.value?.name || 'album'} on PicHaus`),
    ogDescription: computed(() => album.value?.description || `View ${album.value?.name || 'album'} on PicHaus`),
    ogImage: computed(() => album.value ? `/api/v1/album/${albumId}/og-image` : null),
    twitterCard: 'summary_large_image',
    twitterImage: computed(() => album.value ? `/api/v1/album/${albumId}/og-image` : null),
})

// Share Modal State
const showShareModal = ref(false)
const shareLinks = ref<ShareLink[]>([])
const loadingLinks = ref(false)
const creatingLink = ref(false)
const newLink = ref({
    type: 'view',
    label: '',
    password: '',
    showMetadata: true
})

// QR code modal
const qrLinkId = ref<string | null>(null)
const qrCanvasRef = ref<HTMLCanvasElement | null>(null)
const qrLink = computed(() => shareLinks.value.find(l => l.id === qrLinkId.value) ?? null)

const showQr = async (link: ShareLink) => {
    qrLinkId.value = link.id
    await nextTick()
    if (qrCanvasRef.value) {
        const QRCode = await import('qrcode')
        await QRCode.toCanvas(qrCanvasRef.value, getShareUrl(link), { width: 280, margin: 2 })
    }
}

const closeQr = () => { qrLinkId.value = null }

const { containerRef, picturesLayout } = useJustifiedLayout(photos)

let _mounted = false
onMounted(() => { _mounted = true })
onUnmounted(() => {
    _mounted = false
    window.removeEventListener('keydown', handleKeydown)
    resetTheme()
    applyAccent(siteSettings.value.accentColor)
})

// Check authentication (don't redirect if failed, just set user to null)
const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
    } catch (err) {
        user.value = null
    }
}

// Fetch album (initial load)
const fetchAlbum = async () => {
    try {
        loading.value = page.value === 1
        loadingPhotos.value = page.value > 1

        // Build query params with filters
        const params = new URLSearchParams({
            page: page.value.toString(),
            limit: limit.value.toString()
        })

        if (filters.value.camera) params.append('camera', filters.value.camera)
        if (filters.value.lens) params.append('lens', filters.value.lens)
        if (filters.value.photographer) params.append('photographer', filters.value.photographer)

        const response = await $fetch<{ success: boolean; data: Album }>(`/api/v1/album/${albumId}?${params.toString()}`)
        album.value = response.data

        if (response.data.photos) {
            photos.value = response.data.photos
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        }

        // Populate edit form
        if (album.value) {
            let parsedCustomTheme = { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' }
            if (album.value.customTheme) {
                try { parsedCustomTheme = JSON.parse(album.value.customTheme) } catch { /* use defaults */ }
            }
            editForm.value = {
                name: album.value.name,
                description: album.value.description ?? '',
                tags: (album.value.tags || []).join(', '),
                eventDate: album.value.eventDate ? (new Date(album.value.eventDate * 1000).toISOString().split('T')[0] ?? '') : '',
                isPublic: album.value.isPublic,
                themePreset: album.value.themePreset ?? 'default',
                customTheme: parsedCustomTheme,
                logoText: album.value.logoText ?? '',
                logoImageId: album.value.logoImageId ?? null,
            }
            if (_mounted) applyTheme(album.value.themePreset, album.value.customTheme)
        }
    } catch (err: any) {
        // If 403 and not logged in, redirect to login
        if (err.statusCode === 403 && !user.value) {
            return navigateTo(`/login?redirect=${route.fullPath}`)
        }
        error.value = err.data?.statusMessage || 'Failed to load album'
    } finally {
        loading.value = false
        loadingPhotos.value = false
    }
}

// Copy album link
const copyAlbumLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
}

const parseTagsInput = (value: string): string[] => {
    const tags = value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

    return Array.from(new Set(tags))
}

// Load more photos
const loadMorePhotos = async () => {
    if (loadingPhotos.value || !hasMore.value) return

    loadingPhotos.value = true
    try {
        const nextPage = page.value + 1
        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}`, {
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
        loadingPhotos.value = false
    }
}

// Infinite scroll observer
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

// Blurhash utility
// Update album
const handleUpdateAlbum = async () => {
    updating.value = true
    editError.value = ''

    try {
        const eventDate = editForm.value.eventDate
            ? Math.floor(new Date(editForm.value.eventDate).getTime() / 1000)
            : null

        await $fetch(`/api/v1/album/${albumId}`, {
            method: 'PATCH',
            body: {
                name: editForm.value.name,
                description: editForm.value.description || null,
                tags: parseTagsInput(editForm.value.tags),
                eventDate,
                isPublic: editForm.value.isPublic,
                themePreset: editForm.value.themePreset === 'default' ? null : editForm.value.themePreset,
                customTheme: editForm.value.themePreset === 'custom' ? JSON.stringify(editForm.value.customTheme) : null,
                logoText: editForm.value.logoText || null,
                logoImageId: editForm.value.logoImageId || null,
            },
        })

        showEditModal.value = false
        // Refresh album details but keep photos if possible, or reload
        // For simplicity, reload first page
        await fetchAlbum()
    } catch (err: any) {
        editError.value = err.data?.statusMessage || 'Failed to update album'
    } finally {
        updating.value = false
    }
}

// Delete album
const confirmDelete = async () => {
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
        return
    }

    try {
        await $fetch(`/api/v1/album/${albumId}`, { method: 'DELETE' })
        await navigateTo('/album')
    } catch (err: any) {
        showToast(err.data?.statusMessage || 'Failed to delete album', 'error')
    }
}

const openEditPhotoModal = () => {
    if (selectedPhotoIds.value.size !== 1) return
    const photoId = Array.from(selectedPhotoIds.value)[0]
    const photo = photos.value.find(p => p.id === photoId)
    if (!photo) return

    editPhotoForm.value = {
        id: photo.id,
        dateTaken: photo.dateTaken ? new Date(photo.dateTaken * 1000).toISOString().slice(0, 16) : '',
        cameraModel: photo.cameraModel || '',
        lens: photo.lens || '',
        focalLength: photo.focalLength || '',
        aperture: photo.aperture || '',
        shutterSpeed: photo.shutterSpeed || '',
        iso: photo.iso || null,
    }
    showEditPhotoModal.value = true
}

const handleUpdatePhoto = async () => {
    updatingPhoto.value = true
    editPhotoError.value = ''

    try {
        const dateTaken = editPhotoForm.value.dateTaken
            ? Math.floor(new Date(editPhotoForm.value.dateTaken).getTime() / 1000)
            : null

        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/photo/${editPhotoForm.value.id}`, {
            method: 'PATCH',
            body: {
                ...editPhotoForm.value,
                dateTaken
            }
        })

        // Update local state
        const index = photos.value.findIndex(p => p.id === editPhotoForm.value.id)
        if (index !== -1) {
            photos.value[index] = { ...photos.value[index], ...response.data }
        }

        showEditPhotoModal.value = false
        clearSelection()
    } catch (err: any) {
        editPhotoError.value = err.data?.statusMessage || 'Failed to update photo'
    } finally {
        updatingPhoto.value = false
    }
}

// Share Logic

const openShareModal = async () => {
    showShareModal.value = true
    await fetchShareLinks()
}

const fetchShareLinks = async () => {
    loadingLinks.value = true
    try {
        const response = await $fetch<{ success: boolean; data: ShareLink[] }>(`/api/v1/album/${albumId}/share-links`)
        shareLinks.value = response.data
    } catch (err) {
        console.error('Failed to fetch share links:', err)
    } finally {
        loadingLinks.value = false
    }
}

const updatingLink = ref(false)
const editingLinkId = ref<string | null>(null)
const removePassword = ref(false)
const editingLinkHasPassword = ref(false)

const isEditing = computed(() => !!editingLinkId.value)

const createShareLink = async () => {
    creatingLink.value = true
    try {
        const response = await $fetch<{ success: boolean; data: ShareLink }>(`/api/v1/album/${albumId}/share-links`, {
            method: 'POST',
            body: newLink.value
        })
        newLink.value = { type: 'view', label: '', password: '', showMetadata: true }
        await fetchShareLinks()
        showToast('Link created')
        const created = shareLinks.value.find(l => l.id === response.data?.id)
        if (created) showQr(created)
    } catch (err: any) {
        showToast(err.data?.statusMessage || 'Failed to create link', 'error')
    } finally {
        creatingLink.value = false
    }
}

const startEditing = (link: ShareLink) => {
    editingLinkId.value = link.id
    newLink.value = {
        type: link.type,
        label: link.label || '',
        password: '', // Clear password field
        showMetadata: link.showMetadata
    }
    editingLinkHasPassword.value = link.password
    removePassword.value = false
}

const cancelEditing = () => {
    editingLinkId.value = null
    newLink.value = { type: 'view', label: '', password: '', showMetadata: true }
    removePassword.value = false
    editingLinkHasPassword.value = false
}

const updateShareLink = async () => {
    if (!editingLinkId.value) return
    updatingLink.value = true

    try {
        const body: any = {
            label: newLink.value.label,
            showMetadata: newLink.value.showMetadata
        }

        if (newLink.value.password) {
            body.password = newLink.value.password
        } else if (removePassword.value) {
            body.removePassword = true
        }

        await $fetch(`/api/v1/share-links/${editingLinkId.value}`, {
            method: 'PUT',
            body
        })

        showToast('Link updated')
        cancelEditing()
        await fetchShareLinks()
    } catch (err: any) {
        showToast(err.data?.statusMessage || 'Failed to update link', 'error')
    } finally {
        updatingLink.value = false
    }
}


const deleteLink = async (id: string) => {
    if (!confirm('Delete this link? Users will no longer be able to access it.')) return
    try {
        await $fetch(`/api/v1/share-links/${id}`, { method: 'DELETE' })
        await fetchShareLinks()
        showToast('Link deleted')
    } catch (err: any) {
        showToast(err.data?.statusMessage || 'Failed to delete link', 'error')
    }
}

const getShareUrl = (link: ShareLink) => {
    if (link.type === 'upload') {
        return `${window.location.origin}/u/${link.token}`
    }
    return `${window.location.origin}/v/${link.token}`
}

const copyLink = async (link: ShareLink) => {
    const url = getShareUrl(link)

    try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url)
        } else {
            // Fallback for mobile devices or older browsers
            const textArea = document.createElement('textarea')
            textArea.value = url
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()

            try {
                document.execCommand('copy')
            } catch (err) {
                console.error('Fallback copy failed:', err)
            }

            document.body.removeChild(textArea)
        }

        link.copied = true
        setTimeout(() => link.copied = false, 2000)
    } catch (err) {
        console.error('Failed to copy link:', err)
        showToast('Failed to copy link', 'error')
    }
}

// Single Photo Actions
const setAsCover = async (photo: Photo) => {
    photoCropImage.value = photo
    showCropModal.value = true
}

const downloadPhoto = async (photo: Photo) => {
    try {
        const res = await fetch(`/api/assets/full/${photo.id}`)
        const blob = await res.blob()
        saveAs(blob, photo.originalName)
    } catch (err) {
        console.error('Failed to download photo', err)
        showToast('Failed to download photo', 'error')
    }
}

const deletePhoto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return
    try {
        await $fetch(`/api/v1/album/${albumId}/photos/batch-delete`, {
            method: 'POST',
            body: { ids: [id] }
        })
        photos.value = photos.value.filter(p => p.id !== id)
        selectedPhotoIds.value.delete(id)
        await fetchAlbum()
        showToast('Photo deleted')
    } catch (err: any) {
        showToast(err.data?.statusMessage || 'Failed to delete photo', 'error')
    }
}

// ── Crop cover image ──────────────────────────────────────────────────────────

const drawCropOverlay = () => {
    const canvas = cropCanvasRef.value
    if (!canvas || !cropArea.value.width) return
    const layout = getCropImageLayout()
    if (!layout) return
    const { scale } = layout

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const sx = cropArea.value.x * scale
    const sy = cropArea.value.y * scale
    const sw = cropArea.value.width * scale
    const sh = cropArea.value.height * scale

    // Darken area outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(sx, sy, sw, sh)

    // Crop border
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.strokeRect(sx, sy, sw, sh)

    // Rule-of-thirds grid
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(sx + sw * i / 3, sy); ctx.lineTo(sx + sw * i / 3, sy + sh); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(sx, sy + sh * i / 3); ctx.lineTo(sx + sw, sy + sh * i / 3); ctx.stroke()
    }

    // Corner handles
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 4
    for (const [hx, hy] of [[sx, sy], [sx + sw, sy], [sx, sy + sh], [sx + sw, sy + sh]] as [number, number][]) {
        ctx.fillRect(hx - CROP_HANDLE / 2, hy - CROP_HANDLE / 2, CROP_HANDLE, CROP_HANDLE)
    }
    ctx.shadowBlur = 0
}

let redrawScheduled = false
const scheduleRedraw = () => {
    if (redrawScheduled) return
    redrawScheduled = true
    requestAnimationFrame(() => {
        drawCropOverlay()
        redrawScheduled = false
    })
}

const initializeCrop = () => {
    const img = cropImageRef.value
    if (!img) return
    syncCanvas()
    const W = photoCropImage.value?.width || img.naturalWidth
    const H = photoCropImage.value?.height || img.naturalHeight
    if (!W) return
    let width = W, height = width / COVER_CROP_RATIO
    if (height > H) { height = H; width = height * COVER_CROP_RATIO }
    cropArea.value = { x: (W - width) / 2, y: (H - height) / 2, width, height }
    drawCropOverlay()
}

const resetCrop = () => {
    const img = cropImageRef.value
    if (!img) return
    const W = photoCropImage.value?.width || img.naturalWidth
    const H = photoCropImage.value?.height || img.naturalHeight
    if (!W) return
    let width = W, height = width / COVER_CROP_RATIO
    if (height > H) { height = H; width = height * COVER_CROP_RATIO }
    cropArea.value = { x: (W - width) / 2, y: (H - height) / 2, width, height }
    drawCropOverlay()
}

const cropCursorMap: Record<CropDragMode, string> = {
    none: 'crosshair', new: 'crosshair', move: 'move',
    'resize-tl': 'nwse-resize', 'resize-br': 'nwse-resize',
    'resize-tr': 'nesw-resize', 'resize-bl': 'nesw-resize',
}

const handleCropMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    const canvas = cropCanvasRef.value
    if (canvas) {
        cachedCanvasRect = canvas.getBoundingClientRect()
    }
    const pt = cropCanvasPoint(e)
    cropDragMode.value = cropHitTest(pt.x, pt.y)
    cropDragOrigin.value = pt
    cropDragSnapshot.value = { ...cropArea.value }
}

const handleCropMouseMove = (e: MouseEvent) => {
    const pt = cropCanvasPoint(e)

    if (cropDragMode.value === 'none') {
        const canvas = cropCanvasRef.value
        if (canvas) canvas.style.cursor = cropCursorMap[cropHitTest(pt.x, pt.y)]
        return
    }

    e.preventDefault()
    const layout = getCropImageLayout()
    if (!layout) return
    const { scale } = layout
    const img = cropImageRef.value!
    const W = photoCropImage.value?.width || img.naturalWidth
    const H = photoCropImage.value?.height || img.naturalHeight
    const snap = cropDragSnapshot.value

    if (cropDragMode.value === 'move') {
        const dx = (pt.x - cropDragOrigin.value.x) / scale
        const dy = (pt.y - cropDragOrigin.value.y) / scale
        cropArea.value = {
            ...snap,
            x: Math.max(0, Math.min(snap.x + dx, W - snap.width)),
            y: Math.max(0, Math.min(snap.y + dy, H - snap.height)),
        }
    } else if (cropDragMode.value === 'new') {
        const ax = cropDragOrigin.value.x / scale, ay = cropDragOrigin.value.y / scale
        const cx = pt.x / scale, cy = pt.y / scale
        const rawW = Math.abs(cx - ax), rawH = Math.abs(cy - ay)
        const width = Math.max(rawW, rawH * COVER_CROP_RATIO)
        const height = width / COVER_CROP_RATIO
        const x = cx < ax ? ax - width : ax
        const y = cy < ay ? ay - height : ay
        const clamped = clampCropToImage(x, y, width, height, W, H)
        if (clamped.width > 30) cropArea.value = clamped
    } else {
        // Corner resize — keep opposite corner anchored
        let anchorX: number, anchorY: number
        if (cropDragMode.value === 'resize-tl') { anchorX = snap.x + snap.width; anchorY = snap.y + snap.height }
        else if (cropDragMode.value === 'resize-tr') { anchorX = snap.x; anchorY = snap.y + snap.height }
        else if (cropDragMode.value === 'resize-bl') { anchorX = snap.x + snap.width; anchorY = snap.y }
        else { anchorX = snap.x; anchorY = snap.y }
        const cx = pt.x / scale, cy = pt.y / scale
        const rawW = Math.abs(cx - anchorX), rawH = Math.abs(cy - anchorY)
        const width = Math.max(rawW, rawH * COVER_CROP_RATIO, 50)
        const height = width / COVER_CROP_RATIO
        const x = cx < anchorX ? anchorX - width : anchorX
        const y = cy < anchorY ? anchorY - height : anchorY
        cropArea.value = clampCropToImage(x, y, width, height, W, H)
    }

    scheduleRedraw()
}

const handleCropMouseUp = () => { cropDragMode.value = 'none' }

const handleCropTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]; if (!t) return
    handleCropMouseDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => {} } as any)
}
const handleCropTouchMove = (e: TouchEvent) => {
    const t = e.touches[0]; if (!t) return
    handleCropMouseMove({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => {} } as any)
}
const handleCropTouchEnd = () => { cropDragMode.value = 'none' }

const confirmCrop = async () => {
    if (!photoCropImage.value || !cropImageRef.value) return
    croppingCover.value = true
    try {
        const res = await fetch(`/api/v1/album/${albumId}/cover-crop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({
                photoId: photoCropImage.value.id,
                x: cropArea.value.x,
                y: cropArea.value.y,
                width: cropArea.value.width,
                height: cropArea.value.height,
            }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.message || 'Crop failed')
        }
        showCropModal.value = false
        photoCropImage.value = null
        showToast('Album cover updated!')
    } catch (err: any) {
        showToast(err.message || 'Failed to crop image', 'error')
    } finally {
        croppingCover.value = false
    }
}

const cancelCrop = () => {
    showCropModal.value = false
    photoCropImage.value = null
    cropDragMode.value = 'none'
}

const openEditPhotoModalFromMenu = (photo: Photo) => {
    editPhotoForm.value = {
        id: photo.id,
        dateTaken: photo.dateTaken ? new Date(photo.dateTaken * 1000).toISOString().slice(0, 16) : '',
        cameraModel: photo.cameraModel || '',
        lens: photo.lens || '',
        focalLength: photo.focalLength || '',
        aperture: photo.aperture || '',
        shutterSpeed: photo.shutterSpeed || '',
        iso: photo.iso || null,
    }
    showEditPhotoModal.value = true
}

// Download all photos
const downloadAll = async () => {
    if (downloading.value) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: 0 }

    try {
        // Fetch all photo URLs
        const response = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId}/download-info`)
        const photosToDownload = response.data

        if (photosToDownload.length === 0) {
            showToast('No photos to download', 'info')
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const zip = new JSZip()
        const folder = zip.folder(album.value?.name || 'album')

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
        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            // We could also track zip generation progress here if we wanted
            // but file download is usually the bottleneck
        })
        saveAs(content, `${album.value?.name || 'album'}.zip`)
    } catch (err) {
        console.error('Download all error:', err)
        showToast('Failed to download photos', 'error')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

// Trigger file input
const triggerFileInput = () => {
    fileInput.value?.click()
}


// Helper to safely parse JSON
const tryParseJSON = (json: string) => {
    try {
        return JSON.parse(json)
    } catch (e) {
        return null
    }
}

// Queue Processing Logic
const maxConcurrency = ref(3)
const isHashing = ref(false)
const activeUploads = ref(0)

const processNextStep = async () => {
    // 1. Check if we need to hash/check any files (Sequential: One at a time)
    if (!isHashing.value) {
        const itemHashing = uploadQueue.value.find(item => item.status === 'hashing')

        if (itemHashing) {
            isHashing.value = true
            try {
                // Calculate hash
                const hash = await calculateSHA256(itemHashing.file)

                // Check duplicate
                // We send array of 1 to reuse the existing endpoint
                const { duplicates } = await $fetch<{ success: boolean, duplicates: string[] }>(`/api/v1/album/${albumId}/check-duplicates`, {
                    method: 'POST',
                    body: { hashes: [hash] }
                })

                if (duplicates.includes(hash)) {
                    itemHashing.status = 'skipped'
                    itemHashing.progress = 100
                } else {
                    itemHashing.status = 'pending'
                }
            } catch (err: any) {
                console.error('Hash/Check failed:', err)
                itemHashing.status = 'failed'
                itemHashing.error = err.message || 'Verification failed'
            } finally {
                isHashing.value = false
                // Trigger next step immediately after hashing one
                processNextStep()
            }
        }
    }

    // 2. Check if we can start more uploads (Concurrent: Up to maxConcurrency)
    // Filter for actual active uploads to be safe (though activeUploads ref should track it)
    const currentActive = uploadQueue.value.filter(i => i.status === 'uploading').length
    // Sync ref just in case
    activeUploads.value = currentActive

    if (currentActive < maxConcurrency.value) {
        const nextItem = uploadQueue.value.find(item => item.status === 'pending')

        if (nextItem) {
            // Start upload (async fire and forget)
            uploadFile(nextItem)
            // Try to start another if we still have capacity
            processNextStep()
        }
    }
}

const uploadFile = async (item: UploadItem) => {
    item.status = 'uploading'
    item.progress = 0
    // activeUploads is updated by the loop check or we can track it here but better to rely on status

    try {
        const formData = new FormData()
        formData.append('file', item.file)

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    item.progress = Math.round((e.loaded * 100) / e.total)
                }
            }

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve()
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        data: tryParseJSON(xhr.responseText)
                    })
                }
            }

            xhr.onerror = () => reject({ status: 0, statusText: 'Network Error' })

            const authToken = getAuthToken()
            xhr.open('POST', `/api/v1/album/${albumId}/upload`)
            if (authToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
            }
            xhr.send(formData)
        })

        item.status = 'completed'
        item.progress = 100

        // Check if all done to refresh album
        if (uploadQueue.value.every(i => ['completed', 'skipped', 'failed'].includes(i.status))) {
            fetchAlbum()
        }

    } catch (err: any) {
        if (err.status === 409) {
            item.status = 'skipped'
            item.progress = 100
        } else {
            console.error('Upload failed:', err)
            item.status = 'failed'
            item.error = err.data?.statusMessage || err.statusText || 'Upload failed'
            item.progress = 0
        }
    } finally {
        // activeUploads decrement happens implicitly because status changes from 'uploading'
        processNextStep()
    }
}

// Entry point for processing
const processQueue = () => {
    processNextStep()
}

// Handle file selection
const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (!files || files.length === 0) return

    showUploadModal.value = true

    // Add to queue
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file) continue

        uploadQueue.value.push({
            id: Math.random().toString(36).substring(7),
            file,
            status: 'hashing'
        })
    }

    // Start processing
    processQueue()

    if (target) target.value = ''
}

// Handle drop event (for drag and drop)
const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const files = event.dataTransfer?.files

    if (!files || files.length === 0) return

    showUploadModal.value = true

    // Add to queue
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file) continue

        uploadQueue.value.push({
            id: Math.random().toString(36).substring(7),
            file,
            status: 'hashing'
        })
    }

    // Start processing
    processQueue()
}

// Retry Logic
const retryFailed = () => {
    uploadQueue.value.forEach(item => {
        if (item.status === 'failed') {
            item.status = 'pending'
            item.error = undefined
        }
    })
    processQueue()
}

const clearCompleted = () => {
    uploadQueue.value = uploadQueue.value.filter(item => item.status !== 'completed' && item.status !== 'skipped')
    if (uploadQueue.value.length === 0) {
        showUploadModal.value = false
    }
}

// Logout
const handleLogout = async () => {
    try {
        await $fetch('/api/v1/auth/logout', { method: 'POST' })
        clearAuthToken()
        await navigateTo('/login')
    } catch (err) {
        console.error('Logout error:', err)
    }
}

// Format date
const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

const handlePhotoTileClick = (index: number, event: MouseEvent) => {
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey) {
        const photo = photos.value[index]
        if (photo) toggleSelection(photo.id)
        return
    }
    openPhotoViewer(index)
}

const openPhotoViewer = (index: number) => {
    selectedPhotoIndex.value = index
}

const closePhotoViewer = () => {
    selectedPhotoIndex.value = null
}

const nextPhoto = async () => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return
    if (selectedPhotoIndex.value < photos.value.length - 1) {
        selectedPhotoIndex.value++
    } else if (hasMore.value && !loadingPhotos.value) {
        // At the last photo but more photos are available - load them
        await loadMorePhotos()
        // After loading, advance to the next photo if we got more
        if (selectedPhotoIndex.value !== null && selectedPhotoIndex.value < photos.value.length - 1) {
            selectedPhotoIndex.value++
        }
    }
}

const previousPhoto = () => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return
    if (selectedPhotoIndex.value > 0) {
        selectedPhotoIndex.value--
    }
}

// Initialize
onMounted(async () => {
    await checkAuth()
    await fetchAlbum()

    if (route.query.edit === '1') {
        showEditModal.value = true
    }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>