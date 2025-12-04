<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <!-- Navigation Bar -->
        <!-- Navigation Bar -->
        <NavBar v-if="album && (album.permissions.isOwner || album.permissions.canEdit)" :show-back="true"
            back-text="Back to Albums" back-to="/album" />

        <!-- Loading State -->
        <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <div class="animate-pulse text-purple-300 text-xl">Loading album...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p class="text-red-200">{{ error }}</p>
            </div>
        </div>

        <!-- Album Content -->
        <div v-else-if="album" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 class="text-4xl font-bold text-white mb-2">{{ album.name }}</h1>
                    <div class="text-purple-200">
                        <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                        <div v-if="album.description" class="text-white/60 whitespace-pre-line mt-2">{{
                            album.description }}</div>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-white/40">by</span>
                            <button @click="showPhotographersModal = true"
                                class="text-white/80 hover:text-white transition underline decoration-dotted">
                                {{ getPhotographersDisplay }}
                            </button>
                        </div>
                        <span v-if="album.isPublic"
                            class="inline-block mt-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs border border-green-500/30">Public</span>
                    </div>
                </div>

                <div class="flex flex-wrap gap-3 w-full md:w-auto">
                    <!-- Share Button -->
                    <button v-if="album.permissions.isOwner" @click="openShareModal"
                        class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center gap-2">
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
                        class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center gap-2 disabled:opacity-50">
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
                        <button @click="showEditModal = true"
                            class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition whitespace-nowrap">
                            Edit Album
                        </button>
                        <button @click="confirmDelete"
                            class="flex-1 md:flex-none px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition whitespace-nowrap">
                            Delete
                        </button>
                    </template>
                </div>
            </div>

            <!-- Upload Section -->
            <div v-if="album.permissions.canEdit" class="mb-8">
                <div @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop"
                    class="border-2 border-dashed border-white/20 rounded-xl p-4 sm:p-8 text-center hover:border-purple-500/50 hover:bg-white/5 transition cursor-pointer group">
                    <input type="file" ref="fileInput" multiple accept="image/*" class="hidden"
                        @change="handleFileSelect" />
                    <div
                        class="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-400" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Upload Photos</h3>
                    <p class="text-white/60">Drag & drop photos here or click to browse</p>
                </div>

                <!-- Upload Progress -->
                <div v-if="uploading" class="mt-4 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-4 space-y-4">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-white">Uploading {{ uploadProgress.current }} of {{ uploadProgress.total
                            }}...</span>
                            <span class="text-purple-300">{{ Math.round((uploadProgress.current / uploadProgress.total) *
                                100)
                            }}%</span>
                        </div>
                        <div class="w-full bg-white/10 rounded-full h-2">
                            <div class="bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] h-2 rounded-full transition-all duration-300"
                                :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Skipped Photos Info -->
                    <div v-if="uploadProgress.skipped > 0" class="pt-2 border-t border-white/10">
                        <p class="text-sm text-yellow-300 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ uploadProgress.skipped }} photo{{ uploadProgress.skipped !== 1 ? 's' : '' }} already exist{{ uploadProgress.skipped !== 1 ? '' : 's' }} (skipped)
                        </p>
                    </div>
                </div>
            </div>

            <!-- Filters Section -->
            <div class="mb-6 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-4">
                <div class="flex flex-wrap items-center gap-4">
                    <span class="text-white font-medium">Filters:</span>

                    <!-- Camera Filter -->
                    <select v-model="filters.camera" @change="applyFilters"
                        class="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">All Cameras</option>
                        <option v-for="camera in availableCameras" :key="camera" :value="camera">{{ camera }}</option>
                    </select>

                    <!-- Lens Filter -->
                    <select v-model="filters.lens" @change="applyFilters"
                        class="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">All Lenses</option>
                        <option v-for="lens in availableLenses" :key="lens" :value="lens">{{ lens }}</option>
                    </select>

                    <!-- Photographer Filter -->
                    <select v-model="filters.photographer" @change="applyFilters"
                        class="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">All Photographers</option>
                        <option v-for="uploader in availableUploaders" :key="uploader.id" :value="uploader.id">
                            {{ uploader.name || uploader.email }}
                        </option>
                    </select>

                    <!-- Clear Filters -->
                    <button v-if="filters.camera || filters.lens || filters.photographer" @click="clearFilters"
                        class="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition text-sm">
                        Clear Filters
                    </button>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="photos.length === 0 && !uploading"
                class="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <div class="text-6xl mb-4">📷</div>
                <h3 class="text-xl font-bold text-white mb-2">No photos yet</h3>
                <p class="text-purple-200 mb-4">Upload photos to get started</p>
                <button v-if="album.permissions.isOwner" @click="openShareModal"
                    class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                    Share Album
                </button>
            </div>

            <!-- Photo Grid -->
            <div v-else-if="picturesLayout" ref="containerRef" class="relative"
                :style="{ width: `${picturesLayout.containerWidth}px`, height: `${picturesLayout.containerHeight}px` }">
                <div v-for="(photo, index) in photos" :key="photo.id" @click="handlePhotoClick($event, photo, index)"
                    @contextmenu.prevent="handleContextMenu($event, photo)"
                    class="absolute cursor-pointer overflow-hidden rounded-lg bg-white/5 border border-white/10 transition-transform hover:-translate-y-1 group"
                    :class="{ 'ring-4 ring-purple-500 ring-offset-2 ring-offset-black/50': selectedPhotoIds.has(photo.id) }"
                    :style="{
                        top: `${picturesLayout.getPosition(index).top}px`,
                        left: `${picturesLayout.getPosition(index).left}px`,
                        width: `${picturesLayout.getPosition(index).width}px`,
                        height: `${picturesLayout.getPosition(index).height}px`,
                    }">
                    <img v-if="photo.blurhash" :src="getBlurhashUrl(photo.blurhash, photo.width, photo.height) || ''"
                        class="absolute inset-0 w-full h-full object-cover" />
                    <img :src="`/api/assets/${photo.id}/thumb`" :alt="photo.filename" loading="lazy"
                        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" />

                    <!-- Selection Indicator -->
                    <div v-if="selectedPhotoIds.has(photo.id)"
                        class="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20"
                            fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clip-rule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Selection Action Bar -->
            <div v-if="selectedPhotoIds.size > 0"
                class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40">
                <div class="text-white font-medium border-r border-white/20 pr-4">
                    {{ selectedPhotoIds.size }} selected
                </div>

                <button @click="clearSelection" class="text-white/60 hover:text-white transition text-sm">
                    Clear
                </button>

                <div class="h-6 w-px bg-white/20"></div>

                <button @click="downloadSelected" :disabled="downloading"
                    class="flex items-center gap-2 text-white hover:text-purple-300 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span v-if="downloading">{{ downloadProgress.current }}/{{ downloadProgress.total }}</span>
                    <span v-else>Download</span>
                </button>

                <template v-if="album?.permissions.canEdit">
                    <button v-if="selectedPhotoIds.size === 1" @click="openEditPhotoModal"
                        class="flex items-center gap-2 text-white hover:text-purple-300 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Info</span>
                    </button>

                    <button @click="deleteSelected"
                        class="flex items-center gap-2 text-red-400 hover:text-red-300 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                    </button>
                </template>
            </div>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingPhotos" class="animate-pulse text-purple-300">Loading more photos...</div>
            </div>
        </div>
    </div>

    <!-- Photographers Modal -->
    <div v-if="showPhotographersModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="showPhotographersModal = false">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold text-white">Photographers</h3>
                <button @click="showPhotographersModal = false" class="text-white/60 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="space-y-3">
                <div v-for="photographer in allPhotographers" :key="photographer.id"
                    class="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex-1">
                            <p class="text-white font-medium">{{ photographer.name }}</p>
                            <p v-if="photographer.email" class="text-purple-300 text-sm">{{ photographer.email }}</p>
                            <div v-if="photographer.instagram" class="flex items-center gap-2 mt-1">
                                <span class="text-purple-300 text-sm">@{{ photographer.instagram }}</span>
                                <a :href="`https://instagram.com/${photographer.instagram || ''}`" target="_blank"
                                    rel="noopener noreferrer" class="text-pink-400 hover:text-pink-300 transition">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                        <span class="px-2 py-1 bg-purple-500/20 text-purple-200 rounded-full text-xs whitespace-nowrap">
                            {{ photographer.role }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Photo Modal -->
    <div v-if="showEditPhotoModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="showEditPhotoModal = false">
        <div
            class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-2xl font-bold text-white mb-4">Edit Photo Info</h3>

            <form @submit.prevent="handleUpdatePhoto" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Date Taken</label>
                    <input v-model="editPhotoForm.dateTaken" type="datetime-local"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Camera</label>
                        <input v-model="editPhotoForm.cameraModel" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Lens</label>
                        <input v-model="editPhotoForm.lens" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Focal Length</label>
                        <input v-model="editPhotoForm.focalLength" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Aperture</label>
                        <input v-model="editPhotoForm.aperture" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Shutter Speed</label>
                        <input v-model="editPhotoForm.shutterSpeed" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">ISO</label>
                        <input v-model="editPhotoForm.iso" type="number"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                </div>

                <div v-if="editPhotoError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p class="text-red-200 text-sm">{{ editPhotoError }}</p>
                </div>

                <div class="flex space-x-3">
                    <button type="button" @click="showEditPhotoModal = false"
                        class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Cancel
                    </button>
                    <button type="submit" :disabled="updatingPhoto"
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ updatingPhoto ? 'Updating...' : 'Update' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Album Modal -->
    <div v-if="showEditModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="showEditModal = false">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <h3 class="text-2xl font-bold text-white mb-4">Edit Album</h3>

            <form @submit.prevent="handleUpdateAlbum" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Album Name *</label>
                    <input v-model="editForm.name" type="text" required
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Description</label>
                    <textarea v-model="editForm.description" rows="3"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-purple-200 mb-2">Event Date</label>
                    <input v-model="editForm.eventDate" type="date"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>

                <div class="flex items-center">
                    <input v-model="editForm.isPublic" type="checkbox" id="editIsPublic"
                        class="w-4 h-4 text-purple-600 bg-white/5 border-white/10 rounded focus:ring-purple-500" />
                    <label for="editIsPublic" class="ml-2 text-sm text-purple-200">Make album public</label>
                </div>

                <div v-if="editError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <p class="text-red-200 text-sm">{{ editError }}</p>
                </div>

                <div class="flex space-x-3">
                    <button type="button" @click="showEditModal = false"
                        class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                        Cancel
                    </button>
                    <button type="submit" :disabled="updating"
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ updating ? 'Updating...' : 'Update' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="showShareModal = false">
        <div
            class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-white">Share Album</h3>
                <button @click="showShareModal = false" class="text-white/60 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Create New Link -->
            <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <h4 class="text-lg font-semibold text-white mb-4">Create New Link</h4>
                <form @submit.prevent="createShareLink" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-purple-200 mb-2">Type</label>
                            <select v-model="newLink.type"
                                class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="view">View Only</option>
                                <option value="upload">Allow Uploads</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-purple-200 mb-2">Label (Optional)</label>
                            <input v-model="newLink.label" type="text" placeholder="e.g. Family Group"
                                class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Password (Optional)</label>
                        <input v-model="newLink.password" type="password" placeholder="Leave empty for no password"
                            class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <button type="submit" :disabled="creatingLink"
                        class="w-full px-4 py-2 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                        {{ creatingLink ? 'Creating...' : 'Create Link' }}
                    </button>
                </form>
            </div>

            <!-- Existing Links -->
            <div>
                <h4 class="text-lg font-semibold text-white mb-4">Active Links</h4>
                <div v-if="loadingLinks" class="text-center py-4 text-purple-300">Loading links...</div>
                <div v-else-if="shareLinks.length === 0" class="text-center py-4 text-white/50">
                    No active share links.
                </div>
                <div v-else class="space-y-3">
                    <div v-for="link in shareLinks" :key="link.id"
                        class="bg-white/5 rounded-lg p-4 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-medium text-white">{{ link.label || 'Untitled Link' }}</span>
                                <span :class="{
                                    'bg-blue-500/20 text-blue-300': link.type === 'view',
                                    'bg-green-500/20 text-green-300': link.type === 'upload'
                                }" class="px-2 py-0.5 rounded text-xs uppercase border border-white/10">
                                    {{ link.type }}
                                </span>
                                <span v-if="link.password" class="text-xs text-yellow-300 flex items-center gap-1">
                                    🔒 Password
                                </span>
                            </div>
                            <div class="flex items-center gap-2 text-sm">
                                <button @click="copyLink(link)"
                                    class="truncate max-w-[200px] text-white/60 hover:text-purple-300 transition underline decoration-dotted">
                                    {{ getShareUrl(link) }}
                                </button>
                                <button @click="copyLink(link)" :class="[
                                    'px-2 py-1 rounded transition text-xs font-medium',
                                    link.copied ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                                ]">
                                    {{ link.copied ? '✓ Copied!' : 'Copy' }}
                                </button>
                            </div>
                            <div class="text-xs text-white/40 mt-1">
                                Created {{ formatDate(link.createdAt) }} • {{ link.views }} views
                            </div>
                        </div>
                        <button @click="deleteLink(link.id)"
                            class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Context Menu -->
    <div v-if="contextMenu.visible"
        class="fixed z-50 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl py-1 w-48"
        :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">

        <button @click="toggleSelection(contextMenu.photo!.id); closeContextMenu()"
            class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
                    v-if="selectedPhotoIds.has(contextMenu.photo!.id)" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" v-else />
            </svg>
            {{ selectedPhotoIds.has(contextMenu.photo!.id) ? 'Deselect' : 'Select' }}
        </button>

        <button @click="downloadPhoto(contextMenu.photo!); closeContextMenu()"
            class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
        </button>

        <template v-if="album?.permissions.canEdit">
            <div class="h-px bg-white/10 my-1"></div>

            <button @click="openEditPhotoModalFromMenu(contextMenu.photo!); closeContextMenu()"
                class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Info
            </button>

            <button @click="deletePhoto(contextMenu.photo!.id); closeContextMenu()"
                class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
            </button>
        </template>
    </div>

    <!-- Photo Viewer -->
    <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
        :has-next="selectedPhotoIndex! < (photos.length || 0) - 1" :previous-photo-id="previousPhotoId"
        :next-photo-id="nextPhotoId" @close="closePhotoViewer" @previous="previousPhoto" @next="nextPhoto" />


</template>

<script setup lang="ts">
import { JustifiedLayout } from '@immich/justified-layout-wasm'
import { decode } from 'blurhash'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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
    eventDate: number | null
    isPublic: boolean
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
    console.log('Owner data:', owner) // Debug log
    console.log('Owner instagram:', owner.instagram) // Debug log
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

    const result = Array.from(photographersMap.values())
    console.log('All photographers:', result) // Debug log
    return result
})

// Computed: Display text for photographers (first names only)
const getPhotographersDisplay = computed(() => {
    return allPhotographers.value
        .map(p => p.name.split(' ')[0]) // Get first name only
        .join(', ')
})

const showEditModal = ref(false)
const editForm = ref({
    name: '',
    description: '',
    eventDate: '',
    isPublic: false,
})
const updating = ref(false)
const editError = ref('')

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

const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadProgress = ref({ current: 0, total: 0, skipped: 0 })
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

const handlePhotoClick = (event: MouseEvent, photo: Photo, index: number) => {
    // If clicking with Cmd/Ctrl, toggle selection
    if (event.metaKey || event.ctrlKey) {
        toggleSelection(photo.id)
        lastSelectedId.value = photo.id
    }
    // If clicking with Shift, range select
    else if (event.shiftKey && lastSelectedId.value) {
        const lastIndex = photos.value.findIndex(p => p.id === lastSelectedId.value)
        if (lastIndex !== -1) {
            const start = Math.min(lastIndex, index)
            const end = Math.max(lastIndex, index)
            const range = photos.value.slice(start, end + 1)

            // If all in range are selected, deselect them. Otherwise select all.
            const allSelected = range.every(p => selectedPhotoIds.value.has(p.id))

            range.forEach(p => {
                if (allSelected) {
                    selectedPhotoIds.value.delete(p.id)
                } else {
                    selectedPhotoIds.value.add(p.id)
                }
            })
        }
    }
    // If in selection mode (some photos selected) and simple click, toggle
    else if (selectedPhotoIds.value.size > 0) {
        toggleSelection(photo.id)
        lastSelectedId.value = photo.id
    }
    // Otherwise open viewer
    else {
        openPhotoViewer(index)
    }
}

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

// Close context menu on click outside
onMounted(() => {
    window.addEventListener('click', closeContextMenu)
    window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    window.removeEventListener('click', closeContextMenu)
    window.removeEventListener('keydown', handleKeydown)
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
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
                const res = await fetch(`/api/assets/${photo.id}/full`)
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
    password: ''
})

// Layout state
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(typeof window !== 'undefined' ? Math.min(1200, window.innerWidth - 64) : 1200)

// Computed layout
const picturesLayout = computed(() => {
    if (!photos.value.length) return null

    // Check for missing dimensions
    const missingDims = photos.value.filter(p => !p.width || !p.height)
    if (missingDims.length > 0) {
        console.warn(`Layout warning: ${missingDims.length} photos missing dimensions. Defaulting to 1:1 aspect ratio.`)
    }

    const aspectRatios = new Float32Array(
        photos.value.map(photo => (photo.width || 1) / (photo.height || 1))
    )

    return new JustifiedLayout(aspectRatios, {
        rowHeight: 180,
        rowWidth: containerWidth.value,
        spacing: 12,
        heightTolerance: 0.1,
    })
})

// Resize observer
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
    window.removeEventListener('keydown', handleKeydown)
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
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
            editForm.value = {
                name: album.value.name,
                description: album.value.description ?? '',
                eventDate: album.value.eventDate ? (new Date(album.value.eventDate * 1000).toISOString().split('T')[0] ?? '') : '',
                isPublic: album.value.isPublic,
            }
        }
    } catch (err: any) {
        // If 403 and not logged in, redirect to login
        if (err.statusCode === 403 && !user.value) {
            return navigateTo(`/login?redirect=${route.fullPath}`)
        }
        error.value = err.data?.statusMessage || 'Failed to load album'
    } finally {
        loading.value = false
    }
}

// Copy album link
const copyAlbumLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
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
const getBlurhashUrl = (hash: string | null, width: number | null, height: number | null) => {
    if (!hash || !width || !height) return null

    // Use smaller dimensions for blurhash to improve performance
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
                eventDate,
                isPublic: editForm.value.isPublic,
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
        alert(err.data?.statusMessage || 'Failed to delete photos')
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

const createShareLink = async () => {
    creatingLink.value = true
    try {
        await $fetch(`/api/v1/album/${albumId}/share-links`, {
            method: 'POST',
            body: newLink.value
        })
        newLink.value = { type: 'view', label: '', password: '' }
        await fetchShareLinks()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to create link')
    } finally {
        creatingLink.value = false
    }
}

const deleteLink = async (id: string) => {
    if (!confirm('Delete this link? Users will no longer be able to access it.')) return
    try {
        await $fetch(`/api/v1/share-links/${id}`, { method: 'DELETE' })
        await fetchShareLinks()
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete link')
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
        alert('Failed to copy link. Please copy manually: ' + url)
    }
}

// Single Photo Actions
const downloadPhoto = async (photo: Photo) => {
    try {
        const res = await fetch(`/api/assets/${photo.id}/full`)
        const blob = await res.blob()
        saveAs(blob, photo.originalName)
    } catch (err) {
        console.error('Failed to download photo', err)
        alert('Failed to download photo')
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
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete photo')
    }
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
            alert('No photos to download')
            return
        }

        downloadProgress.value.total = photosToDownload.length

        const zip = new JSZip()
        const folder = zip.folder(album.value?.name || 'album')

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/${photo.id}/full`)
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
        alert('Failed to download photos')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

// Trigger file input
const triggerFileInput = () => {
    fileInput.value?.click()
}

// Handle file selection
const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (!files || files.length === 0) return

    uploading.value = true
    uploadProgress.value = { current: 0, total: files.length, skipped: 0 }

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (!file) continue

            const formData = new FormData()
            formData.append('file', file)

            try {
                await $fetch(`/api/v1/album/${albumId}/upload`, {
                    method: 'POST',
                    body: formData,
                })
            } catch (err: any) {
                // If file already exists, skip it and continue
                if (err.status === 409) {
                    uploadProgress.value.skipped++
                    uploadProgress.value.current = i + 1
                    continue
                }
                // For other errors, re-throw
                throw err
            }

            uploadProgress.value.current = i + 1
        }

        // Refresh album to show new photos
        await fetchAlbum()

        // Reset file input
        if (target) target.value = ''
    } catch (err: any) {
        console.error('Upload error:', err)
        alert(err.data?.statusMessage || 'Failed to upload photos')
    } finally {
        uploading.value = false
        uploadProgress.value = { current: 0, total: 0, skipped: 0 }
    }
}

// Handle drop event (for drag and drop)
const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const files = event.dataTransfer?.files
    
    if (!files || files.length === 0) return

    uploading.value = true
    uploadProgress.value = { current: 0, total: files.length, skipped: 0 }

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (!file) continue

            const formData = new FormData()
            formData.append('file', file)

            try {
                await $fetch(`/api/v1/album/${albumId}/upload`, {
                    method: 'POST',
                    body: formData,
                })
            } catch (err: any) {
                // If file already exists, skip it and continue
                if (err.status === 409) {
                    uploadProgress.value.skipped++
                    uploadProgress.value.current = i + 1
                    continue
                }
                // For other errors, re-throw
                throw err
            }

            uploadProgress.value.current = i + 1
        }

        // Refresh album to show new photos
        await fetchAlbum()
    } catch (err: any) {
        console.error('Upload error:', err)
        alert(err.data?.statusMessage || 'Failed to upload photos')
    } finally {
        uploading.value = false
        uploadProgress.value = { current: 0, total: 0, skipped: 0 }
    }
}

// Logout
const handleLogout = async () => {
    try {
        await $fetch('/api/v1/auth/logout', { method: 'POST' })
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

const openPhotoViewer = (index: number) => {
    selectedPhotoIndex.value = index
}

const closePhotoViewer = () => {
    selectedPhotoIndex.value = null
}

const nextPhoto = () => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return
    if (selectedPhotoIndex.value < photos.value.length - 1) {
        selectedPhotoIndex.value++
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
})
</script>
