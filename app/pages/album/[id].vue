<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <!-- Navigation Bar -->
        <!-- Navigation Bar -->
        <NavBar v-if="album && (album.permissions.isOwner || album.permissions.isCollaborator || album.permissions.canEdit)" :show-back="true"
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
            <div class="rounded-lg p-4" style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                <p>{{ error }}</p>
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

                <div class="flex flex-wrap gap-2 w-full md:w-auto items-center">
                    <!-- Upload (Primary Action) -->
                    <template v-if="album.permissions.canUpload">
                        <button @click="triggerFileInput"
                            class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap flex items-center justify-center gap-1.5"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            <Icon name="lucide:upload" class="h-4 w-4" :stroke-width="2" />
                            Upload
                        </button>
                    </template>

                    <!-- Share Button -->
                    <button v-if="album.permissions.isOwner" @click="openShareModal"
                        class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-1.5"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <span>Share</span>
                        <Icon name="lucide:share-2" class="h-4 w-4" :stroke-width="2" />
                    </button>

                    <!-- Download All Button -->
                    <button v-if="album.permissions.isOwner || album.permissions.isCollaborator || album.permissions.canEdit" @click="downloadAll"
                        :disabled="downloading"
                        class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-1.5"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        <span v-if="downloading">
                            {{ downloadProgress.current }}/{{ downloadProgress.total }}
                        </span>
                        <span v-else>Download All</span>
                        <Icon name="lucide:download" class="h-4 w-4" :stroke-width="2" />
                    </button>

                    <!-- Instagram Story Export Button -->
                    <button v-if="photos.length > 0" @click="exportRandomStoryGrid"
                        :disabled="exportingStoryGrid || loadingPhotos"
                        class="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        <span>{{ exportingStoryGrid ? 'Generating…' : 'Random Story' }}</span>
                        <Icon v-if="!exportingStoryGrid" name="lucide:instagram" class="h-4 w-4" :stroke-width="2" />
                        <Icon v-else name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                    </button>

                    <!-- Collaborators Button -->
                    <button v-if="album.permissions.isOwner" @click="openCollaboratorsModal"
                        class="p-2 rounded-full transition flex items-center justify-center border"
                        style="background: var(--surface-2); color: var(--text-1); border-color: var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                        title="Collaborators">
                        <Icon name="lucide:users" class="h-5 w-5" :stroke-width="2" />
                    </button>

                    <!-- Edit Album Button -->
                    <button v-if="album.permissions.canEdit" @click="showEditModal = true"
                        class="p-2 rounded-full transition flex items-center justify-center border"
                        style="background: var(--surface-2); color: var(--text-1); border-color: var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                        title="Edit Album Settings">
                        <Icon name="lucide:settings" class="h-5 w-5" :stroke-width="2" />
                    </button>
                </div>
            </div>

            <!-- Upload Section -->
            <div v-if="album.permissions.canUpload" class="mb-8">
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
                                <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
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
                <div class="flex flex-wrap items-center justify-between gap-3">
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

                        <div class="h-4 w-px mx-1 hidden sm:block" style="background: var(--separator);"></div>
                        <span class="text-xs font-semibold mr-1" style="color: var(--text-3);">Sort:</span>

                        <select v-model="sortBy" @change="applyFilters"
                            class="px-3 py-2 text-sm rounded-xl"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                            <option value="dateTaken">Date Taken</option>
                            <option value="createdAt">Upload Date</option>
                        </select>

                        <select v-model="sortOrder" @change="applyFilters"
                            class="px-3 py-2 text-sm rounded-xl"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2 ml-auto lg:ml-0">
                        <button v-if="hasMore" @click="loadAllPhotos" :disabled="loadingPhotos"
                            class="px-3 py-2 rounded-xl text-sm transition flex items-center gap-1.5 font-medium whitespace-nowrap"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            <Icon name="lucide:layers" class="h-4 w-4" />
                            <span>{{ loadingPhotos ? 'Loading…' : 'Load All Pictures' }}</span>
                        </button>
                        <button v-else-if="photos.length > 0" @click="selectAll"
                            class="px-3 py-2 rounded-xl text-sm transition flex items-center gap-1.5 font-medium whitespace-nowrap"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1);"
                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                            <Icon name="lucide:check-square" class="h-4 w-4" />
                            <span>Select All</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="photos.length === 0 && !uploading" class="text-center py-16 rounded-2xl"
                style="background: var(--surface-1); border: 1px solid var(--separator);">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style="background: var(--surface-3);">
                    <Icon name="lucide:camera" class="w-7 h-7" style="color: var(--text-3);" :stroke-width="1.5" />
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
                    <Icon name="lucide:download" class="h-4 w-4" :stroke-width="2" />
                    <span v-if="downloading">{{ downloadProgress.current }}/{{ downloadProgress.total }}</span>
                    <span v-else>Download</span>
                </button>

                <template v-if="canManageSelectedPhotos">
                    <button v-if="selectedPhotoIds.size === 1" @click="openEditPhotoModal"
                        class="flex items-center gap-1.5 text-sm font-medium transition" style="color: var(--text-1);">
                        <Icon name="lucide:square-pen" class="h-4 w-4" :stroke-width="2" />
                        Edit Info
                    </button>

                    <!-- Adjust Time Button -->
                    <button @click="openAdjustTimeModal"
                        class="flex items-center gap-1.5 text-sm font-medium transition" style="color: var(--text-1);">
                        <Icon name="lucide:calendar-clock" class="h-4 w-4" :stroke-width="2" />
                        Adjust Time
                    </button>

                    <!-- Rotate Left Button -->
                    <button @click="rotateSelected(-90)" :disabled="rotatingPhotos"
                        class="flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50" style="color: var(--text-1);">
                        <Icon name="lucide:rotate-ccw" class="h-4 w-4" :stroke-width="2" />
                        Rotate Left
                    </button>

                    <!-- Rotate Right Button -->
                    <button @click="rotateSelected(90)" :disabled="rotatingPhotos"
                        class="flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50" style="color: var(--text-1);">
                        <Icon name="lucide:rotate-cw" class="h-4 w-4" :stroke-width="2" />
                        Rotate Right
                    </button>

                    <!-- Transfer Button -->
                    <button @click="openTransferModal" :disabled="transferringPhotos"
                        class="flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50" style="color: var(--text-1);">
                        <Icon name="lucide:user-cog" class="h-4 w-4" :stroke-width="2" />
                        Transfer
                    </button>

                    <button @click="deleteSelected"
                        class="flex items-center gap-1.5 text-sm font-medium transition" style="color: var(--error-text);">
                        <Icon name="lucide:trash-2" class="h-4 w-4" :stroke-width="2" />
                        Delete
                    </button>
                </template>
            </div>

            <Transition name="fade">
                <div v-if="storyShareTimedOut"
                    class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <template v-if="pendingStoryShareFile">
                        <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0" style="color: var(--accent);" :stroke-width="2" />
                        <span class="text-sm text-text-1 font-medium">Story ready</span>
                        <button @click="retryStoryShare"
                            class="text-sm font-semibold px-3 py-1 rounded-xl transition active:scale-95"
                            style="background: var(--accent); color: var(--accent-text);">
                            Tap to share
                        </button>
                    </template>
                    <template v-else>
                        <Icon name="lucide:loader-2" class="h-5 w-5 flex-shrink-0 animate-spin text-text-3" />
                        <span class="text-sm text-text-2">Generating story image…</span>
                    </template>
                </div>
            </Transition>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingPhotos" class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded-full border-2 animate-spin" style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                    <span class="text-xs" style="color: var(--text-3);">Loading more…</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Transfer Modal -->
    <div v-if="showTransferModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => showTransferModal = false)">
        <div class="rounded-2xl p-6 max-w-md w-full"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="flex justify-between items-center mb-5">
                <h3 class="text-xl font-semibold" style="color: var(--text-1);">Transfer Photos</h3>
                <button @click="showTransferModal = false" style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                    <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
                </button>
            </div>

            <p class="text-sm mb-4" style="color: var(--text-2);">
                Transfer the selected {{ selectedPhotoIds.size }} photo(s) to another photographer.
            </p>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color: var(--text-3);">
                        Target Photographer
                    </label>
                    <select v-model="targetTransferUploaderId"
                        class="w-full px-4 py-2.5 rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-accent"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        <option value="" disabled>Select a photographer...</option>
                        <option v-for="photographer in allPhotographers" :key="photographer.id" :value="photographer.id">
                            {{ photographer.name }} ({{ photographer.role }})
                        </option>
                    </select>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button @click="showTransferModal = false"
                        class="px-4 py-2 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        Cancel
                    </button>
                    <button @click="transferPhotos"
                        :disabled="!targetTransferUploaderId || transferringPhotos"
                        class="px-5 py-2 rounded-full text-sm font-medium text-accent-text transition flex items-center gap-1.5 disabled:opacity-50"
                        style="background: var(--accent);"
                        @mouseover="!transferringPhotos && targetTransferUploaderId && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <Icon v-if="transferringPhotos" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                        <span>Transfer</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Photographers Modal -->
    <div v-if="showPhotographersModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => showPhotographersModal = false)">
        <div class="rounded-2xl p-6 max-w-md w-full"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="flex justify-between items-center mb-5">
                <h3 class="text-xl font-semibold" style="color: var(--text-1);">Photographers</h3>
                <button @click="showPhotographersModal = false" style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                    <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
                </button>
            </div>

            <div class="space-y-2">
                <div v-for="photographer in uploadedPhotographers" :key="photographer.id"
                    class="rounded-xl p-3" style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <div class="flex items-center justify-between gap-3">
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
                                <p class="text-sm font-medium truncate" style="color: var(--text-1);">{{ photographer.name }}</p>
                                <p v-if="photographer.email" class="text-xs mt-0.5 truncate" style="color: var(--text-2);">{{ photographer.email }}</p>
                                <div v-if="photographer.instagram" class="flex items-center gap-2 mt-1">
                                    <span class="text-xs" style="color: var(--text-2);">@{{ photographer.instagram }}</span>
                                    <a :href="`https://instagram.com/${photographer.instagram || ''}`" target="_blank"
                                        rel="noopener noreferrer" class="text-accent hover:text-accent-hover transition">
                                        <Icon name="lucide:instagram" class="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                        <span class="px-2 py-1 rounded-full text-xs whitespace-nowrap flex-shrink-0"
                            style="background: var(--accent-light); color: var(--accent);">
                            {{ photographer.role }}
                        </span>
                    </div>
                </div>

                <p v-if="uploadedPhotographers.length === 0" class="text-sm text-center py-4" style="color: var(--text-3);">
                    No photos have been uploaded yet.
                </p>
            </div>
        </div>
    </div>

    <!-- Edit Photo Modal -->
    <div v-if="showEditPhotoModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => showEditPhotoModal = false)">
        <div class="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <h3 class="text-xl font-bold mb-4" style="color: var(--text-1);">Edit Photo Info</h3>

            <form @submit.prevent="handleUpdatePhoto" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Date Taken</label>
                    <input v-model="editPhotoForm.dateTaken" type="datetime-local"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Camera</label>
                        <input v-model="editPhotoForm.cameraModel" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Lens</label>
                        <input v-model="editPhotoForm.lens" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Focal Length</label>
                        <input v-model="editPhotoForm.focalLength" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Aperture</label>
                        <input v-model="editPhotoForm.aperture" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Shutter Speed</label>
                        <input v-model="editPhotoForm.shutterSpeed" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">ISO</label>
                        <input v-model="editPhotoForm.iso" type="number"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
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

    <!-- Adjust Time Modal -->
    <div v-if="showAdjustTimeModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => showAdjustTimeModal = false)">
        <div class="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <h3 class="text-xl font-bold mb-2" style="color: var(--text-1);">Adjust Camera Timestamps</h3>
            <p class="text-xs mb-4" style="color: var(--text-3);">
                Update metadata for the selected {{ selectedPhotoIds.size }} photos.
            </p>

            <form @submit.prevent="handleAdjustTime" class="space-y-4">
                <!-- Mode Toggle Tabs -->
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Adjustment Mode</label>
                    <div class="grid grid-cols-2 gap-1 p-1 rounded-xl" style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <button type="button" @click="adjustTimeForm.mode = 'offset'"
                            class="py-1.5 px-3 text-xs rounded-lg font-medium transition"
                            :style="adjustTimeForm.mode === 'offset'
                                ? 'background: var(--surface-1); color: var(--text-1); box-shadow: var(--shadow-sm);'
                                : 'color: var(--text-2);'">
                            Constant Offset
                        </button>
                        <button type="button" @click="adjustTimeForm.mode = 'sequence'"
                            class="py-1.5 px-3 text-xs rounded-lg font-medium transition"
                            :style="adjustTimeForm.mode === 'sequence'
                                ? 'background: var(--surface-1); color: var(--text-1); box-shadow: var(--shadow-sm);'
                                : 'color: var(--text-2);'">
                            Sequence (Broken RTC)
                        </button>
                    </div>
                </div>

                <!-- MODE 1: OFFSET -->
                <template v-if="adjustTimeForm.mode === 'offset'">
                    <!-- Direction toggle -->
                    <div>
                        <label class="block text-xs font-semibold mb-1.5" style="color: var(--text-3);">Adjustment Direction</label>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" @click="adjustTimeForm.direction = 'add'"
                                class="py-2 px-3 text-xs rounded-xl font-semibold transition flex items-center justify-center gap-1.5 border"
                                :style="adjustTimeForm.direction === 'add'
                                    ? 'background: var(--accent); color: var(--accent-text); border-color: var(--accent);'
                                    : 'background: var(--surface-2); color: var(--text-1); border-color: var(--separator);'">
                                <Icon name="lucide:plus" class="w-4 h-4" />
                                Add Time
                            </button>
                            <button type="button" @click="adjustTimeForm.direction = 'subtract'"
                                class="py-2 px-3 text-xs rounded-xl font-semibold transition flex items-center justify-center gap-1.5 border"
                                :style="adjustTimeForm.direction === 'subtract'
                                    ? 'background: var(--accent); color: var(--accent-text); border-color: var(--accent);'
                                    : 'background: var(--surface-2); color: var(--text-1); border-color: var(--separator);'">
                                <Icon name="lucide:minus" class="w-4 h-4" />
                                Subtract Time
                            </button>
                        </div>
                    </div>

                    <!-- Offset inputs grid -->
                    <div class="grid grid-cols-4 gap-2">
                        <div>
                            <label class="block text-xs font-semibold text-center mb-1" style="color: var(--text-3);">Days</label>
                            <input v-model.number="adjustTimeForm.days" type="number" min="0" placeholder="0"
                                class="w-full text-center px-2 py-2 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-center mb-1" style="color: var(--text-3);">Hours</label>
                            <input v-model.number="adjustTimeForm.hours" type="number" min="0" placeholder="0"
                                class="w-full text-center px-2 py-2 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-center mb-1" style="color: var(--text-3);">Mins</label>
                            <input v-model.number="adjustTimeForm.minutes" type="number" min="0" placeholder="0"
                                class="w-full text-center px-2 py-2 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-center mb-1" style="color: var(--text-3);">Secs</label>
                            <input v-model.number="adjustTimeForm.seconds" type="number" min="0" placeholder="0"
                                class="w-full text-center px-2 py-2 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                        </div>
                    </div>

                    <!-- Offset Preview Area -->
                    <div class="rounded-xl p-3.5 space-y-1.5 text-xs border" style="background: var(--surface-2); border-color: var(--separator);">
                        <div class="font-semibold uppercase tracking-wider mb-1" style="color: var(--text-3);">Timestamp Preview</div>
                        <div class="flex justify-between" style="color: var(--text-2);">
                            <span>Original:</span>
                            <span class="font-mono text-right">{{ formatUnixDate(firstSelectedPhoto?.dateTaken || firstSelectedPhoto?.createdAt) }}</span>
                        </div>
                        <div class="flex justify-between font-bold" style="color: var(--text-1);">
                            <span>Adjusted:</span>
                            <span class="font-mono text-right text-[var(--accent)]">{{ previewAdjustedDate }}</span>
                        </div>
                    </div>
                </template>

                <!-- MODE 2: SEQUENCE -->
                <template v-else>
                    <!-- Starting time picker -->
                    <div>
                        <label class="block text-xs font-semibold mb-1.5" style="color: var(--text-3);">Starting Date & Time</label>
                        <input v-model="adjustTimeForm.sequenceStart" type="datetime-local"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                    </div>

                    <!-- Interval selection -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold mb-1.5" style="color: var(--text-3);">Interval Step</label>
                            <input v-model.number="adjustTimeForm.sequenceIntervalValue" type="number" min="1"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold mb-1.5" style="color: var(--text-3);">Interval Unit</label>
                            <select v-model="adjustTimeForm.sequenceIntervalUnit"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                                <option value="1">Seconds</option>
                                <option value="60">Minutes</option>
                                <option value="3600">Hours</option>
                            </select>
                        </div>
                    </div>

                    <!-- Sequence ordering -->
                    <div>
                        <label class="block text-xs font-semibold mb-1.5" style="color: var(--text-3);">Apply Chronologically</label>
                        <select v-model="adjustTimeForm.sequenceSortBy"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                            <option value="filename">By Original Filename (Recommended)</option>
                            <option value="current">By Current Sorted View Order</option>
                        </select>
                        <p class="text-[10px] mt-1" style="color: var(--text-3);">
                            Since filenames like DSC_0001, DSC_0002 are usually numbered sequentially by the camera, sorting by filename fixes broken RTCs perfectly.
                        </p>
                    </div>

                    <!-- Sequence Previews -->
                    <div class="rounded-xl p-3.5 space-y-2 text-xs border" style="background: var(--surface-2); border-color: var(--separator);">
                        <div class="font-semibold uppercase tracking-wider mb-1" style="color: var(--text-3);">Sequence Preview</div>
                        <div v-for="(prev, idx) in sequencePreviews" :key="`prev-${idx}`" class="flex justify-between gap-2">
                            <span class="truncate font-medium" style="color: var(--text-2);">{{ prev.name }}</span>
                            <span class="font-mono text-right shrink-0" style="color: var(--text-1);">{{ prev.time }}</span>
                        </div>
                        <div v-if="selectedPhotoIds.size > 3" class="text-center pt-1.5 border-t border-dashed" style="border-color: var(--separator); color: var(--text-3);">
                            and {{ selectedPhotoIds.size - 3 }} more photos...
                        </div>
                    </div>
                </template>

                <div v-if="adjustTimeError" class="rounded-xl px-4 py-3 text-sm"
                    style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                    {{ adjustTimeError }}
                </div>

                <div class="flex gap-3 mt-4">
                    <button type="button" @click="showAdjustTimeModal = false"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Cancel
                    </button>
                    <button type="submit" :disabled="adjustingTime"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="!adjustingTime && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        {{ adjustingTime ? 'Adjusting…' : 'Apply Adjustment' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Crop Album Cover Modal -->
    <div v-if="showCropModal"
        class="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto"
        style="background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);"
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => cancelCrop())">
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
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => { showEditModal = false; applyTheme(album?.themePreset, album?.customTheme) })">
        <div class="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <h3 class="text-xl font-bold mb-4" style="color: var(--text-1);">Edit Album</h3>

            <form @submit.prevent="handleUpdateAlbum" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Album Name *</label>
                    <input v-model="editForm.name" type="text" required
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Description</label>
                    <textarea v-model="editForm.description" rows="3"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Tags</label>
                    <input v-model="editForm.tags" type="text"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="wedding, portrait, night"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    <p class="text-xs mt-1" style="color: var(--text-3);">Separate tags with commas</p>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Event Date</label>
                    <input v-model="editForm.eventDate" type="date"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
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
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
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

                <div class="flex justify-between items-center gap-3">
                    <button type="button" @click="confirmDelete(); showEditModal = false"
                        class="px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap hover:brightness-105"
                        style="background: var(--error-bg); color: var(--error-text);">
                        Delete Album
                    </button>
                    <div class="flex gap-2 w-full justify-end">
                        <button type="button" @click="showEditModal = false; applyTheme(album?.themePreset, album?.customTheme)"
                            class="px-4 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                            Cancel
                        </button>
                        <button type="submit" :disabled="updating"
                            class="px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!updating && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            Save Changes
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal"
        class="fixed inset-0 flex items-center justify-center p-4 z-50"
        style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
        @mousedown="handleBackdropMousedown"
        @mouseup="handleBackdropMouseup($event, () => showShareModal = false)">
        <div class="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold" style="color: var(--text-1);">Share Album</h3>
                <button @click="showShareModal = false" class="transition"
                    style="color: var(--text-3);"
                    @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                    <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
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
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
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
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
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
                        <div class="flex items-center gap-2">
                            <input v-model="newLink.faceSearchEnabled" type="checkbox" id="faceSearchEnabled"
                                class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <label for="faceSearchEnabled" class="text-sm" style="color: var(--text-2);">Allow visitors to search photos by face</label>
                        </div>
                    </div>
                    <div v-if="newLink.type === 'upload'">
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Upload Announcement <span style="color: var(--text-3);">(optional)</span></label>
                        <textarea v-model="newLink.uploadMessage" rows="2"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                            style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="e.g. Ensure images are culled, please don't dump raws"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                        <p class="text-xs mt-1" style="color: var(--text-3);">Shown as a banner to uploaders when they open the link.</p>
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
                                <span v-if="(link as any).faceSearchEnabled === false" class="text-xs px-2 py-0.5 rounded-full"
                                    style="background: var(--surface-3); color: var(--text-3);">
                                    No Face Search
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
                                <Icon name="lucide:qr-code" class="h-5 w-5" :stroke-width="2" />
                            </button>
                            <button @click="startEditing(link)"
                                class="p-2 rounded-lg transition"
                                style="color: var(--text-2);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <Icon name="lucide:square-pen" class="h-5 w-5" :stroke-width="2" />
                            </button>
                            <button @click="deleteLink(link.id)"
                                class="p-2 rounded-lg transition"
                                style="color: var(--error);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <Icon name="lucide:trash-2" class="h-5 w-5" :stroke-width="2" />
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
                    @mousedown="handleBackdropMousedown"
                    @mouseup="handleBackdropMouseup($event, () => closeQr())">
                    <div class="rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
                        style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                        <div class="w-full flex justify-between items-center">
                            <span class="font-semibold truncate text-sm" style="color: var(--text-1);">{{ qrLink?.label || 'Share Link' }}</span>
                            <button @click="closeQr" class="transition"
                                style="color: var(--text-3);"
                                @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                                <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
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

        <!-- Collaborators Modal -->
        <div v-if="showCollaboratorsModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @mousedown="handleBackdropMousedown"
            @mouseup="handleBackdropMouseup($event, () => showCollaboratorsModal = false)">
            <div class="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold" style="color: var(--text-1);">Manage Collaborators</h3>
                    <button @click="showCollaboratorsModal = false" class="transition"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <Icon name="lucide:x" class="h-5 w-5" :stroke-width="2" />
                    </button>
                </div>

                <!-- Add Collaborator -->
                <div class="rounded-2xl p-4 mb-6" style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <h4 class="text-base font-semibold mb-4" style="color: var(--text-1);">Add Collaborator</h4>
                    <form @submit.prevent="addCollaborator" class="space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">User Email</label>
                                <input v-model="newCollaboratorEmail" type="email" required placeholder="user@email.com"
                                    class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                    style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.15)'"
                                    @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Role</label>
                                <select v-model="newCollaboratorRole"
                                    class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                    style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                                    @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'">
                                    <option value="editor">Editor (Can upload/delete)</option>
                                    <option value="viewer">Viewer (Read-only)</option>
                                    <option value="admin">Admin (Full permissions)</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="submit" :disabled="addingCollaborator"
                                class="px-5 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                                style="background: var(--accent); color: var(--accent-text);"
                                @mouseover="!addingCollaborator && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                                <Icon v-if="addingCollaborator" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                                <span>{{ addingCollaborator ? 'Adding…' : 'Add Collaborator' }}</span>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Existing Collaborators -->
                <div>
                    <h4 class="text-base font-semibold mb-4" style="color: var(--text-1);">Collaborator List</h4>
                    <div v-if="loadingCollaborators" class="text-center py-6 text-sm" style="color: var(--text-3);">
                        <div class="inline-flex items-center gap-2">
                            <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin" />
                            <span>Loading collaborators…</span>
                        </div>
                    </div>
                    <div v-else-if="collaboratorsList.length === 0" class="text-center py-6 text-sm" style="color: var(--text-3);">
                        No explicit collaborators added yet.
                    </div>
                    <div v-else class="space-y-3">
                        <div v-for="collab in collaboratorsList" :key="collab.id"
                            class="rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                            style="background: var(--surface-2); border: 1px solid var(--separator);">
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <img v-if="collab.user.avatar" :src="collab.user.avatar"
                                    class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    style="border: 1px solid var(--separator);" />
                                <div v-else
                                    class="w-10 h-10 rounded-full flex items-center justify-center text-accent-text font-bold text-sm flex-shrink-0"
                                    style="background: var(--accent);">
                                    {{ collab.user.name?.charAt(0) || '?' }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold truncate" style="color: var(--text-1);">{{ collab.user.name || 'Unknown User' }}</p>
                                    <p class="text-xs truncate" style="color: var(--text-3);">{{ collab.user.email }}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                <select :value="collab.role" @change="updateCollaboratorRole(collab, ($event.target as HTMLSelectElement).value)"
                                    class="px-2 py-1.5 text-xs rounded-lg transition"
                                    style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button @click="removeCollaborator(collab)"
                                    class="p-2 rounded-lg transition hover:bg-[var(--error-bg)] text-[var(--error-text)]"
                                    title="Remove Collaborator">
                                    <Icon name="lucide:trash-2" class="w-4 h-4" :stroke-width="2" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
                <Icon :name="selectedPhotoIds.has(contextMenu.photo!.id) ? 'lucide:check' : 'lucide:plus'" class="h-4 w-4" :stroke-width="2" />
                {{ selectedPhotoIds.has(contextMenu.photo!.id) ? 'Deselect' : 'Select' }}
            </button>

            <button @click="downloadPhoto(contextMenu.photo!); closeContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                style="color: var(--text-1); width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <Icon name="lucide:download" class="h-4 w-4" :stroke-width="2" />
                Download
            </button>

            <template v-if="album?.permissions.canUpload">
                <div class="h-px my-1 mx-3" style="background: var(--separator);"></div>

                <button @click="setAsCover(contextMenu.photo!); closeContextMenu()"
                    class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                    style="color: var(--text-1); width: calc(100% - 8px);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                    <Icon name="lucide:image" class="h-4 w-4" :stroke-width="2" />
                    Set as Album Cover
                </button>

                <template v-if="canEditPhoto(contextMenu.photo)">
                    <button @click="openEditPhotoModalFromMenu(contextMenu.photo!); closeContextMenu()"
                        class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                        style="color: var(--text-1); width: calc(100% - 8px);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                        <Icon name="lucide:square-pen" class="h-4 w-4" :stroke-width="2" />
                        Edit Info
                    </button>

                    <button @click="deletePhoto(contextMenu.photo!.id); closeContextMenu()"
                        class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg mx-1"
                        style="color: var(--error); width: calc(100% - 8px);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                        <Icon name="lucide:trash-2" class="h-4 w-4" :stroke-width="2" />
                        Delete
                    </button>
                </template>
            </template>
        </div>

        <!-- Photo Viewer -->
        <PhotoViewer v-if="selectedPhoto" :photo="selectedPhoto" :has-previous="selectedPhotoIndex! > 0"
            :has-next="selectedPhotoIndex! < (photos.length || 0) - 1 || hasMore" :previous-photo-id="previousPhotoId"
            :next-photo-id="nextPhotoId" :previous-photo-timestamp="previousPhotoTimestamp"
            :next-photo-timestamp="nextPhotoTimestamp" @close="closePhotoViewer" @previous="previousPhoto" @next="nextPhoto" />


        <!-- Full-screen Drag-to-Upload Overlay -->
        <Teleport to="body">
            <Transition name="fade">
                <div v-if="isDragging"
                    class="fixed inset-0 z-[9999] flex items-center justify-center"
                    style="background: rgba(0,0,0,0.6);">
                    <div class="text-center pointer-events-none">
                        <div class="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center"
                            style="background: var(--accent-light); border: 2px dashed var(--accent);">
                            <Icon name="lucide:upload" class="h-10 w-10" style="color: var(--accent);" :stroke-width="1.5" />
                        </div>
                        <p class="text-xl font-semibold text-white">Drop photos to upload</p>
                        <p class="text-sm mt-1 text-white/60">Release to add to this album</p>
                    </div>
                </div>
            </Transition>
        </Teleport>

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

                <h3 class="text-xl font-bold mb-1" style="color: var(--text-1);">{{ isIOS ? 'Download Complete!' : 'Download Started!' }}</h3>
                <p class="text-sm mb-6" style="color: var(--text-3);">Support the photographers who made these shots possible by tagging or following them:</p>

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
                    Done
                </button>
            </div>
        </div>

</template>

<script setup lang="ts">
import JSZip from 'jszip'
import { clearAuthToken, buildAssetUrl, getAuthToken } from '~/utils/auth-client'

const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100 MB


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
const { confirm: dialogConfirm, toast } = useDialog()
import { calculateSHA256 } from '~/utils/hash'

interface User {
    id: string
    name: string | null
    email: string | null
    instagram: string | null
    role?: string
    avatar?: string | null
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
    updatedAt?: number
    processingStatus?: string | null
    uploader: {
        id: string
        name: string | null
        instagram?: string | null
        avatar?: string | null
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
        avatar?: string | null
    }
    createdAt: number
}

interface Permissions {
    isOwner: boolean
    isCollaborator: boolean
    canEdit: boolean
    canDelete: boolean
    canUpload: boolean
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
    filtersData?: {
        cameras: string[]
        lenses: string[]
        uploaders: Array<{
            id: string
            name: string | null
            email: string | null
            instagram: string | null
            avatar: string | null
        }>
    }
}

interface ShareLink {
    id: string
    token: string
    type: 'view' | 'upload'
    label: string | null
    password: boolean // Backend returns boolean if password exists
    showMetadata: boolean
    faceSearchEnabled?: boolean
    views: number
    createdAt: number
    copied?: boolean
}

const route = useRoute()
const router = useRouter()
const albumId = route.params.id as string

const user = ref<User | null>(null)
const album = ref<Album | null>(null)
const loading = ref(true)
const error = ref('')

const canEditPhoto = (photo: Photo | null) => {
    if (!photo) return false
    if (album.value?.permissions.isOwner) return true
    if (user.value?.role === 'ADMIN') return true
    if (album.value?.permissions.canUpload && photo.uploader?.id === user.value?.id) return true
    return false
}

const canManageSelectedPhotos = computed(() => {
    if (selectedPhotoIds.value.size === 0) return false
    const selectedPhotos = photos.value.filter(p => selectedPhotoIds.value.has(p.id))
    return selectedPhotos.every(p => canEditPhoto(p))
})

// Pagination state
const page = ref(1)
const limit = ref(50)
const hasMore = ref(false)
const loadingPhotos = ref(false)
const photos = ref<Photo[]>([])
const sentinelRef = ref<HTMLElement | null>(null)

// Filter state
const filters = ref({
    camera: (route.query.camera as string) || '',
    lens: (route.query.lens as string) || '',
    photographer: (route.query.photographer as string) || ''
})

const sortBy = ref((route.query.sort as string) || 'dateTaken')
const sortOrder = ref((route.query.order as string) || 'desc')


// Unique filter options (album-wide, loaded from server)
const availableCameras = ref<string[]>([])
const availableLenses = ref<string[]>([])
const availableUploaders = ref<Array<{
    id: string
    name: string | null
    email: string | null
    instagram?: string | null
    avatar?: string | null
}>>([])

const applyFilters = async () => {
    page.value = 1
    photos.value = []
    
    const query = { ...route.query }
    if (filters.value.camera) query.camera = filters.value.camera
    else delete query.camera
    
    if (filters.value.lens) query.lens = filters.value.lens
    else delete query.lens
    
    if (filters.value.photographer) query.photographer = filters.value.photographer
    else delete query.photographer
    
    if (sortBy.value && sortBy.value !== 'dateTaken') query.sort = sortBy.value
    else delete query.sort
    
    if (sortOrder.value && sortOrder.value !== 'desc') query.order = sortOrder.value
    else delete query.order

    await router.replace({ query })
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

// Watch route.query to handle browser back/forward navigation
watch(() => route.query, (newQuery) => {
    const nextCamera = (newQuery.camera as string) || ''
    const nextLens = (newQuery.lens as string) || ''
    const nextPhotographer = (newQuery.photographer as string) || ''
    const nextSort = (newQuery.sort as string) || 'dateTaken'
    const nextOrder = (newQuery.order as string) || 'desc'
    
    if (
        nextCamera !== filters.value.camera ||
        nextLens !== filters.value.lens ||
        nextPhotographer !== filters.value.photographer ||
        nextSort !== sortBy.value ||
        nextOrder !== sortOrder.value
    ) {
        filters.value.camera = nextCamera
        filters.value.lens = nextLens
        filters.value.photographer = nextPhotographer
        sortBy.value = nextSort
        sortOrder.value = nextOrder
        
        page.value = 1
        photos.value = []
        fetchAlbum()
    }
})

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
        avatar: owner.avatar || null,
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
                avatar: user.avatar || null,
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
                avatar: photo.uploader.avatar || null,
                role: 'Contributor'
            })
        }
    })

    return Array.from(photographersMap.values())
})

// Computed: Get unique photographers who have actually uploaded photos in this album
const uploadedPhotographers = computed(() => {
    if (!album.value) return []
    const activeUploaderIds = new Set(availableUploaders.value.map(u => u.id))
    return allPhotographers.value.filter(p => activeUploaderIds.has(p.id))
})

// Helper: Extract nickname in parenthesis if exists, otherwise fall back to first name
const formatUploaderDisplayName = (fullName: string | null) => {
    if (!fullName) return 'Unknown'
    const nickMatch = fullName.match(/\(([^)]+)\)/)
    if (nickMatch && nickMatch[1]) {
        return nickMatch[1].trim()
    }
    return fullName.split(' ')[0]
}

// Computed: Display text for photographers (first names or nicknames only)
const getPhotographersDisplay = computed(() => {
    const list = uploadedPhotographers.value
    if (list.length === 0 && album.value) {
        // Fallback to owner if no photos are uploaded yet
        const ownerName = album.value.owner.name || album.value.owner.email || 'Unknown'
        return formatUploaderDisplayName(ownerName)
    }
    return list
        .map(p => formatUploaderDisplayName(p.name))
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

const showAdjustTimeModal = ref(false)
const adjustingTime = ref(false)
const adjustTimeError = ref('')
const adjustTimeForm = ref({
    mode: 'offset' as 'offset' | 'sequence',
    direction: 'add' as 'add' | 'subtract',
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    sequenceStart: '',
    sequenceIntervalValue: 1,
    sequenceIntervalUnit: '60',
    sequenceSortBy: 'filename' as 'filename' | 'current'
})

const rotatingPhotos = ref(false)
const showTransferModal = ref(false)
const targetTransferUploaderId = ref('')
const transferringPhotos = ref(false)

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

const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm|avi|mkv|wmv|flv|mpeg|mpg|3gp|3g2)$/i
const IMAGE_FILE_RE = /\.(heic|heif|raw|arw|cr2|nef|orf|rw2|dng)$/i

const isVideoFile = (file: File) => file.type.startsWith('video/') || VIDEO_FILE_RE.test(file.name)
const isAcceptedImageFile = (file: File) => !isVideoFile(file) && (file.type.startsWith('image/') || IMAGE_FILE_RE.test(file.name))

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
const exportingStoryGrid = ref(false)
const showDownloadSuccessModal = ref(false)
const downloadedPhotographers = ref<any[]>([])

const isIOS = computed(() => {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
})

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
        } else if (album.value?.owner) {
            const owner = album.value.owner
            map.set(owner.id, {
                id: owner.id,
                name: owner.name || 'Unknown',
                instagram: owner.instagram || null,
                avatar: owner.avatar || null
            })
        }
    })
    downloadedPhotographers.value = Array.from(map.values())
    showDownloadSuccessModal.value = true
}

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

const previousPhotoTimestamp = computed(() => {
    if (selectedPhotoIndex.value === null || selectedPhotoIndex.value <= 0) return null
    const photo = photos.value[selectedPhotoIndex.value - 1]
    return photo ? photo.updatedAt || photo.createdAt || null : null
})

const nextPhotoTimestamp = computed(() => {
    if (selectedPhotoIndex.value === null || !photos.value.length) return null
    if (selectedPhotoIndex.value >= photos.value.length - 1) return null
    const photo = photos.value[selectedPhotoIndex.value + 1]
    return photo ? photo.updatedAt || photo.createdAt || null : null
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
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPhotoIds.value.size > 0 && canManageSelectedPhotos.value) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

        // Prevent deletion when any modal is active
        if (showEditPhotoModal.value || showAdjustTimeModal.value || showCropModal.value || showShareModal.value || showCollaboratorsModal.value || showEditModal.value || showTransferModal.value) return

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
    if (!album.value?.permissions.canUpload) return
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
    if (album.value?.permissions.canUpload) handleDrop(e)
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
    clearStoryShareTimeout()
})

// Bulk Actions
const downloadSelected = async () => {
    if (downloading.value || selectedPhotoIds.value.size === 0) return
    downloading.value = true
    downloadProgress.value = { current: 0, total: selectedPhotoIds.value.size }

    try {
        const selectedPhotos = photos.value.filter(p => selectedPhotoIds.value.has(p.id))
        const files: { blob: Blob; name: string }[] = []

        await Promise.all(selectedPhotos.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`)
                const blob = await res.blob()
                files.push({ blob, name: photo.originalName })
                downloadProgress.value.current++
            } catch (err) {
                console.error(`Failed to download ${photo.originalName}`, err)
            }
        }))

        if (files.length === 0) {
            downloading.value = false
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

        const albumName = album.value?.name || 'photos'

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]!
            const zip = new JSZip()
            const folder = zip.folder(albumName)
            batch.forEach(f => folder?.file(f.name, f.blob))

            const content = await zip.generateAsync({ type: 'blob' })
            const partSuffix = batches.length > 1 ? `-part${i + 1}` : ''
            downloadBlob(content, `${albumName}-selected${partSuffix}.zip`)

            if (i < batches.length - 1) {
                await new Promise(r => setTimeout(r, 600))
            }
        }

        showSupportPopup(selectedPhotos)
        clearSelection()
    } catch (err) {
        console.error('Download selected error:', err)
        toast('Failed to download selected photos', 'error')
    } finally {
        downloading.value = false
        downloadProgress.value = { current: 0, total: 0 }
    }
}

const getSafeAlbumFilename = () => {
    return (album.value?.name || 'album')
        .trim()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'album'
}

const storyShareTimedOut = ref(false)
const pendingStoryShareFile = ref<File | null>(null)
let storyShareTimeoutId: ReturnType<typeof setTimeout> | null = null

const clearStoryShareTimeout = () => {
    if (storyShareTimeoutId !== null) {
        clearTimeout(storyShareTimeoutId)
        storyShareTimeoutId = null
    }
}

const resetStoryShareState = () => {
    exportingStoryGrid.value = false
    storyShareTimedOut.value = false
    pendingStoryShareFile.value = null
    clearStoryShareTimeout()
}

const shareOrDownloadStoryFile = async (file: File): Promise<'shared' | 'downloaded'> => {
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: file.name })
        return 'shared'
    } else {
        downloadBlob(file, file.name)
        return 'downloaded'
    }
}

const exportRandomStoryGrid = async () => {
    if (exportingStoryGrid.value || photos.value.length === 0) return
    exportingStoryGrid.value = true
    storyShareTimedOut.value = false
    pendingStoryShareFile.value = null

    storyShareTimeoutId = setTimeout(() => {
        if (exportingStoryGrid.value) storyShareTimedOut.value = true
    }, 1500)

    try {
        const response = await fetch(`/api/v1/album/${albumId}/story-image`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to generate story image')

        const blob = await response.blob()
        const filename = `${getSafeAlbumFilename()}-instagram-story.jpg`
        const file = new File([blob], filename, { type: 'image/jpeg' })

        clearStoryShareTimeout()

        if (storyShareTimedOut.value) {
            pendingStoryShareFile.value = file
            return
        }

        const shareStart = Date.now()
        try {
            const result = await shareOrDownloadStoryFile(file)
            toast(result === 'shared' ? 'Story image ready to post' : 'Story image downloaded', 'success')
        } catch (shareErr: any) {
            const duration = Date.now() - shareStart
            if (shareErr.name === 'AbortError' && duration > 250) {
                resetStoryShareState()
                return
            }

            pendingStoryShareFile.value = file
            storyShareTimedOut.value = true
            return
        }

        resetStoryShareState()
    } catch (err: any) {
        if (err?.name !== 'AbortError') {
            console.error('Failed to export story grid:', err)
            toast('Failed to export story image', 'error')
        }
        resetStoryShareState()
    } finally {
        clearStoryShareTimeout()
        if (!storyShareTimedOut.value) exportingStoryGrid.value = false
    }
}

const retryStoryShare = async () => {
    const file = pendingStoryShareFile.value
    if (!file) return

    try {
        await shareOrDownloadStoryFile(file)
    } catch (shareErr: any) {
        if (shareErr.name !== 'AbortError') console.error('Story share failed:', shareErr)
    } finally {
        resetStoryShareState()
    }
}

const deleteSelected = async () => {
    if (!await dialogConfirm(`Are you sure you want to delete ${selectedPhotoIds.value.size} photos?`, { danger: true })) return

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
        toast(err.data?.statusMessage || 'Failed to delete photos', 'error')
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

// Collaborators Modal State
const showCollaboratorsModal = ref(false)
const collaboratorsList = ref<any[]>([])
const loadingCollaborators = ref(false)
const addingCollaborator = ref(false)
const newCollaboratorEmail = ref('')
const newCollaboratorRole = ref('editor')
const loadingLinks = ref(false)
const creatingLink = ref(false)
const newLink = ref({
    type: 'view',
    label: '',
    password: '',
    showMetadata: true,
    faceSearchEnabled: true,
    uploadMessage: '',
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
    if (processingPollTimer) {
        clearInterval(processingPollTimer)
        processingPollTimer = null
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

// Processing status polling
let processingPollTimer: ReturnType<typeof setInterval> | null = null
const hasActiveProcessing = computed(() =>
    photos.value.some(p => p.processingStatus === 'pending' || p.processingStatus === 'processing')
)

function syncProcessingPoll() {
    if (hasActiveProcessing.value && !processingPollTimer) {
        processingPollTimer = setInterval(() => { fetchAlbum(true) }, 5000)
    } else if (!hasActiveProcessing.value && processingPollTimer) {
        clearInterval(processingPollTimer)
        processingPollTimer = null
    }
}

watch(hasActiveProcessing, () => syncProcessingPoll())

// Fetch album (initial load)
const fetchAlbum = async (silent = false) => {
    try {
        if (!silent) {
            loading.value = page.value === 1
            loadingPhotos.value = page.value > 1
        }

        // Build query params with filters and sorting
        const params = new URLSearchParams({
            page: page.value.toString(),
            limit: limit.value.toString(),
            sort: sortBy.value,
            order: sortOrder.value
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

        if (response.data.filtersData) {
            availableCameras.value = response.data.filtersData.cameras || []
            availableLenses.value = response.data.filtersData.lenses || []
            availableUploaders.value = response.data.filtersData.uploaders || []
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
        if (silent) return
        // If 403 and not logged in, redirect to login
        if (err.statusCode === 403 && !user.value) {
            return navigateTo(`/login?redirect=${route.fullPath}`)
        }
        error.value = err.data?.statusMessage || 'Failed to load album'
    } finally {
        loading.value = false
        loadingPhotos.value = false
        syncProcessingPoll()
        fillViewportIfNeeded()
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
        
        const params: Record<string, string> = {
            page: nextPage.toString(),
            limit: limit.value.toString(),
            sort: sortBy.value,
            order: sortOrder.value
        }

        if (filters.value.camera) params.camera = filters.value.camera
        if (filters.value.lens) params.lens = filters.value.lens
        if (filters.value.photographer) params.photographer = filters.value.photographer

        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}`, {
            params
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
        // If the page still isn't tall enough to scroll (large screen), the
        // sentinel stays in view and IntersectionObserver never re-fires —
        // load the next page manually.
        fillViewportIfNeeded()
    }
}

const loadAllPhotos = async () => {
    if (loadingPhotos.value) return
    loadingPhotos.value = true
    try {
        const params: Record<string, string> = {
            page: '1',
            limit: '100000',
            sort: sortBy.value,
            order: sortOrder.value,
            all: 'true'
        }

        if (filters.value.camera) params.camera = filters.value.camera
        if (filters.value.lens) params.lens = filters.value.lens
        if (filters.value.photographer) params.photographer = filters.value.photographer

        const response = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}`, {
            params
        })

        if (response.data.photos) {
            photos.value = response.data.photos
        }

        if (response.data.pagination) {
            hasMore.value = response.data.pagination.hasMore
        } else {
            hasMore.value = false
        }
    } catch (err) {
        console.error('Failed to load all photos:', err)
    } finally {
        loadingPhotos.value = false
    }
}

// Infinite scroll observer
let infiniteScrollObserver: IntersectionObserver | null = null

// On large screens the first page(s) may not fill the viewport, so the
// sentinel is already visible and IntersectionObserver only fires once (when
// hasMore was still false) — it never re-fires because the intersection state
// never changes. This checks whether the sentinel is currently in view and
// loads the next page if so.
let fillViewportTimer: ReturnType<typeof setTimeout> | null = null
function fillViewportIfNeeded() {
    if (fillViewportTimer) clearTimeout(fillViewportTimer)
    fillViewportTimer = setTimeout(() => {
        const el = sentinelRef.value
        if (!el || loadingPhotos.value || !hasMore.value) return
        const rect = el.getBoundingClientRect()
        const inView = rect.top <= window.innerHeight && rect.bottom >= 0
        if (inView) {
            loadMorePhotos()
        }
    }, 150)
}

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
    if (!await dialogConfirm('Are you sure you want to delete this album? This action cannot be undone.', { danger: true })) {
        return
    }

    try {
        await $fetch(`/api/v1/album/${albumId}`, { method: 'DELETE' })
        await navigateTo('/album')
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to delete album', 'error')
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

const toLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

// Backdrop Click-to-Dismiss handlers (prevent closing when clicking inside and dragging out)
let mousedownTarget: EventTarget | null = null

const handleBackdropMousedown = (e: MouseEvent) => {
    mousedownTarget = e.target
}

const handleBackdropMouseup = (e: MouseEvent, closeFn: () => void) => {
    if (mousedownTarget === e.currentTarget && e.target === e.currentTarget) {
        closeFn()
    }
    mousedownTarget = null
}

const openAdjustTimeModal = () => {
    if (selectedPhotoIds.value.size === 0) return
    const firstPhoto = firstSelectedPhoto.value
    const baseTime = firstPhoto ? (firstPhoto.dateTaken || firstPhoto.createdAt) : Math.floor(Date.now() / 1000)

    adjustTimeForm.value = {
        mode: 'offset',
        direction: 'add',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        sequenceStart: toLocalISOString(new Date(baseTime * 1000)),
        sequenceIntervalValue: 1,
        sequenceIntervalUnit: '60',
        sequenceSortBy: 'filename'
    }
    adjustTimeError.value = ''
    showAdjustTimeModal.value = true
}

const totalOffsetSeconds = computed(() => {
    const mult = adjustTimeForm.value.direction === 'subtract' ? -1 : 1
    const days = Number(adjustTimeForm.value.days) || 0
    const hours = Number(adjustTimeForm.value.hours) || 0
    const minutes = Number(adjustTimeForm.value.minutes) || 0
    const seconds = Number(adjustTimeForm.value.seconds) || 0
    return mult * (days * 86400 + hours * 3600 + minutes * 60 + seconds)
})

const firstSelectedPhoto = computed(() => {
    if (selectedPhotoIds.value.size === 0) return null
    const firstId = Array.from(selectedPhotoIds.value)[0]
    return photos.value.find(p => p.id === firstId) || null
})

const formatUnixDate = (unix: number | null | undefined) => {
    if (!unix) return 'N/A'
    const date = new Date(unix * 1000)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

const previewAdjustedDate = computed(() => {
    const photo = firstSelectedPhoto.value
    if (!photo) return 'N/A'
    const currentVal = photo.dateTaken ? photo.dateTaken : photo.createdAt
    const newVal = currentVal + totalOffsetSeconds.value
    return formatUnixDate(newVal)
})

const orderedSelectedPhotos = computed(() => {
    if (selectedPhotoIds.value.size === 0) return []
    const selectedList = photos.value.filter(p => selectedPhotoIds.value.has(p.id))
    const sortBy = adjustTimeForm.value.sequenceSortBy

    if (sortBy === 'filename') {
        return [...selectedList].sort((a, b) => {
            const nameA = a.originalName || a.filename || ''
            const nameB = b.originalName || b.filename || ''
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
        })
    }

    return selectedList
})

const sequenceIntervalSeconds = computed(() => {
    const val = Number(adjustTimeForm.value.sequenceIntervalValue) || 1
    const unit = Number(adjustTimeForm.value.sequenceIntervalUnit) || 60
    return val * unit
})

const sequenceStartUnix = computed(() => {
    if (!adjustTimeForm.value.sequenceStart) return 0
    return Math.floor(new Date(adjustTimeForm.value.sequenceStart).getTime() / 1000)
})

const sequencePreviews = computed(() => {
    const list = orderedSelectedPhotos.value
    const start = sequenceStartUnix.value
    const step = sequenceIntervalSeconds.value
    if (list.length === 0 || !start) return []

    return list.slice(0, 3).map((photo, i) => {
        const time = start + i * step
        return {
            name: photo.originalName || photo.filename,
            time: formatUnixDate(time)
        }
    })
})

const handleAdjustTime = async () => {
    if (selectedPhotoIds.value.size === 0) return
    adjustingTime.value = true
    adjustTimeError.value = ''

    try {
        const mode = adjustTimeForm.value.mode
        let body: Record<string, any> = {}

        if (mode === 'sequence') {
            const photoIds = orderedSelectedPhotos.value.map(p => p.id)
            const startTime = sequenceStartUnix.value
            const interval = sequenceIntervalSeconds.value

            body = {
                mode: 'sequence',
                photoIds,
                startTime,
                interval
            }
        } else {
            const offset = totalOffsetSeconds.value
            const photoIds = Array.from(selectedPhotoIds.value)

            body = {
                mode: 'offset',
                photoIds,
                offset
            }
        }

        const response = await $fetch<{ success: boolean; message: string; data: { updatedPhotos: Array<{ id: string; dateTaken: number; updatedAt: number }> } }>('/api/v1/photos/adjust-date', {
            method: 'POST',
            body
        })

        // Update local state for all adjusted photos
        const updatedMap = new Map(response.data.updatedPhotos.map(p => [p.id, p]))
        photos.value = photos.value.map(p => {
            const updated = updatedMap.get(p.id)
            if (updated) {
                return {
                    ...p,
                    dateTaken: updated.dateTaken,
                }
            }
            return p
        })

        toast(response.message || 'Timestamps adjusted successfully', 'success')
        showAdjustTimeModal.value = false
        clearSelection()
    } catch (err: any) {
        adjustTimeError.value = err.data?.statusMessage || 'Failed to adjust timestamps'
    } finally {
        adjustingTime.value = false
    }
}

const rotateSelected = async (angle: number) => {
    if (selectedPhotoIds.value.size === 0 || rotatingPhotos.value) return
    rotatingPhotos.value = true

    try {
        const photoIds = Array.from(selectedPhotoIds.value)
        const response = await $fetch<{ success: boolean; message: string; data: { updatedPhotos: Array<{ id: string; width: number; height: number; blurhash: string; updatedAt: number }> } }>('/api/v1/photos/rotate', {
            method: 'POST',
            body: {
                photoIds,
                angle
            }
        })

        // Update local state for rotated photos
        const updatedMap = new Map(response.data.updatedPhotos.map(p => [p.id, p]))
        photos.value = photos.value.map(p => {
            const updated = updatedMap.get(p.id)
            if (updated) {
                return {
                    ...p,
                    width: updated.width,
                    height: updated.height,
                    blurhash: updated.blurhash,
                    updatedAt: updated.updatedAt,
                }
            }
            return p
        })

        toast(response.message || 'Photos rotated successfully', 'success')
        clearSelection()
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to rotate photos', 'error')
    } finally {
        rotatingPhotos.value = false
    }
}

const openTransferModal = () => {
    targetTransferUploaderId.value = ''
    showTransferModal.value = true
}

const transferPhotos = async () => {
    if (transferringPhotos.value || !targetTransferUploaderId.value || selectedPhotoIds.value.size === 0) return
    transferringPhotos.value = true
    try {
        const photoIds = Array.from(selectedPhotoIds.value)
        const response = await $fetch<{ success: boolean; data: { targetUploader: { id: string; name: string; instagram: string | null; avatar: string | null }; transferredPhotoIds: string[] } }>('/api/v1/photos/transfer', {
            method: 'POST',
            body: {
                photoIds,
                targetUploaderId: targetTransferUploaderId.value
            }
        })
        if (response.success) {
            const { targetUploader, transferredPhotoIds } = response.data
            // Update local state to reflect uploader change
            photos.value = photos.value.map(p => {
                if (transferredPhotoIds.includes(p.id)) {
                    return {
                        ...p,
                        uploaderId: targetUploader.id,
                        uploader: targetUploader
                    }
                }
                return p
            })
            toast(`Successfully transferred ${transferredPhotoIds.length} photos`, 'success')
            showTransferModal.value = false
            clearSelection()
        }
    } catch (err: any) {
        console.error('Failed to transfer photos:', err)
        toast(err.data?.statusMessage || 'Failed to transfer photos', 'error')
    } finally {
        transferringPhotos.value = false
    }
}

// Share Logic

const openShareModal = async () => {
    showShareModal.value = true
    await fetchShareLinks()
}

// Collaborators Logic
const openCollaboratorsModal = async () => {
    showCollaboratorsModal.value = true
    await fetchCollaborators()
}

const fetchCollaborators = async () => {
    loadingCollaborators.value = true
    try {
        const res = await $fetch<{ success: boolean; data: any[] }>(`/api/v1/album/${albumId}/collaborators`)
        collaboratorsList.value = res.data
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to fetch collaborators', 'error')
    } finally {
        loadingCollaborators.value = false
    }
}

const addCollaborator = async () => {
    if (!newCollaboratorEmail.value) return
    addingCollaborator.value = true
    try {
        const res = await $fetch<{ success: boolean; data: any }>(`/api/v1/album/${albumId}/collaborators`, {
            method: 'POST',
            body: {
                email: newCollaboratorEmail.value,
                role: newCollaboratorRole.value
            }
        })
        collaboratorsList.value.push(res.data)
        newCollaboratorEmail.value = ''
        toast('Collaborator added successfully', 'success')
        await fetchAlbum()
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to add collaborator', 'error')
    } finally {
        addingCollaborator.value = false
    }
}

const updateCollaboratorRole = async (collab: any, newRole: string) => {
    try {
        await $fetch(`/api/v1/album/${albumId}/collaborators/${collab.userId}`, {
            method: 'PATCH',
            body: { role: newRole }
        })
        collab.role = newRole
        toast('Collaborator role updated', 'success')
        await fetchAlbum()
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to update role', 'error')
    }
}

const removeCollaborator = async (collab: any) => {
    try {
        await $fetch(`/api/v1/album/${albumId}/collaborators/${collab.userId}`, {
            method: 'DELETE'
        })
        collaboratorsList.value = collaboratorsList.value.filter(c => c.userId !== collab.userId)
        toast('Collaborator removed', 'success')
        await fetchAlbum()
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to remove collaborator', 'error')
    }
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
        newLink.value = { type: 'view', label: '', password: '', showMetadata: false, faceSearchEnabled: false, uploadMessage: '' }
        await fetchShareLinks()
        toast('Link created', 'success')
        const created = shareLinks.value.find(l => l.id === response.data?.id)
        if (created) showQr(created)
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to create link', 'error')
    } finally {
        creatingLink.value = false
    }
}

const startEditing = (link: ShareLink) => {
    editingLinkId.value = link.id
    newLink.value = {
        type: link.type,
        label: link.label || '',
        password: '',
        showMetadata: link.showMetadata,
        faceSearchEnabled: (link as any).faceSearchEnabled !== undefined ? (link as any).faceSearchEnabled : false,
        uploadMessage: (link as any).uploadMessage || '',
    }
    editingLinkHasPassword.value = link.password
    removePassword.value = false
}

const cancelEditing = () => {
    editingLinkId.value = null
    newLink.value = { type: 'view', label: '', password: '', showMetadata: false, faceSearchEnabled: false, uploadMessage: '' }
    removePassword.value = false
    editingLinkHasPassword.value = false
}

const updateShareLink = async () => {
    if (!editingLinkId.value) return
    updatingLink.value = true

    try {
        const body: any = {
            label: newLink.value.label,
            showMetadata: newLink.value.showMetadata,
            faceSearchEnabled: newLink.value.faceSearchEnabled,
            uploadMessage: newLink.value.uploadMessage || null,
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

        toast('Link updated', 'success')
        cancelEditing()
        await fetchShareLinks()
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to update link', 'error')
    } finally {
        updatingLink.value = false
    }
}


const deleteLink = async (id: string) => {
    if (!await dialogConfirm('Delete this link? Users will no longer be able to access it.', { danger: true })) return
    try {
        await $fetch(`/api/v1/share-links/${id}`, { method: 'DELETE' })
        await fetchShareLinks()
        toast('Link deleted', 'success')
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to delete link', 'error')
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
        toast('Failed to copy link', 'error')
    }
}

// Single Photo Actions
const setAsCover = async (photo: Photo) => {
    photoCropImage.value = photo
    showCropModal.value = true
}

const downloadPhoto = async (photo: Photo) => {
    try {
        const res = await fetch(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`)
        const blob = await res.blob()
        downloadBlob(blob, photo.originalName)
    } catch (err) {
        console.error('Failed to download photo', err)
        toast('Failed to download photo', 'error')
    }
}

const deletePhoto = async (id: string) => {
    if (!await dialogConfirm('Are you sure you want to delete this photo?', { danger: true })) return
    try {
        await $fetch(`/api/v1/album/${albumId}/photos/batch-delete`, {
            method: 'POST',
            body: { ids: [id] }
        })
        photos.value = photos.value.filter(p => p.id !== id)
        selectedPhotoIds.value.delete(id)
        await fetchAlbum()
        toast('Photo deleted', 'success')
    } catch (err: any) {
        toast(err.data?.statusMessage || 'Failed to delete photo', 'error')
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
        toast('Album cover updated!', 'success')
    } catch (err: any) {
        toast(err.message || 'Failed to crop image', 'error')
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
            toast('No photos to download', 'info')
            downloading.value = false
            return
        }

        downloadProgress.value.total = photosToDownload.length
        const files: { blob: Blob; name: string }[] = []

        // Download each photo
        const promises = photosToDownload.map(async (photo) => {
            try {
                const res = await fetch(`/api/assets/full/${photo.id}?t=${photo.updatedAt || photo.createdAt || ''}`)
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

        const albumName = album.value?.name || 'album'

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]!
            const zip = new JSZip()
            const folder = zip.folder(albumName)
            batch.forEach(f => folder?.file(f.name, f.blob))

            const content = await zip.generateAsync({ type: 'blob' })
            const partSuffix = batches.length > 1 ? `-part${i + 1}` : ''
            downloadBlob(content, `${albumName}${partSuffix}.zip`)

            if (i < batches.length - 1) {
                await new Promise(r => setTimeout(r, 600))
            }
        }

        showSupportPopup(photosToDownload)
    } catch (err) {
        console.error('Download all error:', err)
        toast('Failed to download photos', 'error')
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

    try {
        const authToken = getAuthToken()
        const hash = await calculateSHA256(item.file)

        // 1. Initiate resumable upload
        const initRes = await $fetch<{ success: boolean; uploadId?: string; nextOffset?: number; duplicate?: boolean }>(
            `/api/v1/album/${albumId}/upload/resumable/initiate`,
            {
                method: 'POST',
                body: {
                    filename: item.file.name,
                    fileSize: item.file.size,
                    fileHash: hash,
                    mimeType: item.file.type || 'application/octet-stream',
                },
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            }
        )

        if (initRes.duplicate) {
            item.status = 'skipped'
            item.progress = 100
            
            // Check if all done to refresh album
            if (uploadQueue.value.every(i => ['completed', 'skipped', 'failed'].includes(i.status))) {
                fetchAlbum()
            }
            return
        }

        const uploadId = initRes.uploadId
        let offset = initRes.nextOffset ?? 0
        const CHUNK_SIZE = 2 * 1024 * 1024 // 2 MB chunks

        // 2. Upload chunks one by one
        while (offset < item.file.size) {
            const chunk = item.file.slice(offset, offset + CHUNK_SIZE)
            const currentOffset = offset

            await new Promise<void>((resolvePromise, rejectPromise) => {
                const xhr = new XMLHttpRequest()

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const chunkUploaded = e.loaded
                        const totalUploaded = currentOffset + chunkUploaded
                        item.progress = Math.round((totalUploaded * 100) / item.file.size)
                    }
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const res = tryParseJSON(xhr.responseText)
                        if (res && res.nextOffset !== undefined) {
                            offset = res.nextOffset
                        } else {
                            offset += chunk.size
                        }
                        resolvePromise()
                    } else {
                        rejectPromise({
                            status: xhr.status,
                            statusText: xhr.statusText,
                            data: tryParseJSON(xhr.responseText),
                        })
                    }
                }

                xhr.onerror = () => rejectPromise({ status: 0, statusText: 'Network Error' })

                xhr.open('POST', `/api/v1/album/${albumId}/upload/resumable/chunk?uploadId=${uploadId}&offset=${currentOffset}`)
                xhr.setRequestHeader('Content-Type', 'application/octet-stream')
                if (authToken) {
                    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
                }
                xhr.send(chunk)
            })
        }

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
            // Check if all done to refresh album
            if (uploadQueue.value.every(i => ['completed', 'skipped', 'failed'].includes(i.status))) {
                fetchAlbum()
            }
        } else {
            console.error('Upload failed:', err)
            item.status = 'failed'
            item.error = err.data?.statusMessage || err.statusText || 'Upload failed'
            item.progress = 0
        }
    } finally {
        processNextStep()
    }
}

// Entry point for processing
const processQueue = () => {
    processNextStep()
}

const queueSelectedFiles = (files: File[]) => {
    if (files.length === 0) return

    showUploadModal.value = true

    let rejectedCount = 0
    let acceptedCount = 0

    for (const file of files) {
        if (!isAcceptedImageFile(file)) {
            rejectedCount++
            uploadQueue.value.push({
                id: Math.random().toString(36).substring(7),
                file,
                status: 'failed',
                error: 'Only image files can be uploaded. Videos are not supported.',
                progress: 100,
            })
            continue
        }

        acceptedCount++
        uploadQueue.value.push({
            id: Math.random().toString(36).substring(7),
            file,
            status: 'hashing',
        })
    }

    if (rejectedCount > 0) {
        toast('Only image files can be uploaded. Videos are not supported.', 'error')
    }
    if (acceptedCount > 0) processQueue()
}

// Handle file selection
const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files

    if (!files || files.length === 0) return

    queueSelectedFiles(Array.from(files))
    if (target) target.value = ''
}

// Handle drop event (for drag and drop)
const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const files = event.dataTransfer?.files

    if (!files || files.length === 0) return

    queueSelectedFiles(Array.from(files))
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
    const photo = photos.value[index]
    if (!photo) return

    const inSelectionMode = selectedPhotoIds.value.size > 0

    if (event.shiftKey && inSelectionMode && lastSelectedId.value) {
        const lastIndex = photos.value.findIndex(p => p.id === lastSelectedId.value)
        if (lastIndex !== -1) {
            const from = Math.min(lastIndex, index)
            const to = Math.max(lastIndex, index)
            for (let i = from; i <= to; i++) {
                const p = photos.value[i]
                if (p) selectedPhotoIds.value.add(p.id)
            }
        } else {
            toggleSelection(photo.id)
        }
        lastSelectedId.value = photo.id
        return
    }

    if (event.metaKey || event.ctrlKey || inSelectionMode) {
        toggleSelection(photo.id)
        lastSelectedId.value = photo.id
        return
    }

    openPhotoViewer(index)
}

const openPhotoViewer = (index: number) => {
    selectedPhotoIndex.value = index
}

const openPhotoByQuery = async () => {
    const photoId = typeof route.query.photo === 'string' ? route.query.photo : ''
    if (!photoId) return

    const findPhoto = () => photos.value.findIndex(p => p.id === photoId)
    let index = findPhoto()

    // The target photo may sit on a later page; page through until it is found.
    let pagesSearched = 0
    while (index < 0 && hasMore.value && pagesSearched < 20) {
        await loadMorePhotos()
        index = findPhoto()
        pagesSearched++
    }

    if (index >= 0) openPhotoViewer(index)
}

watch(() => route.query.photo, () => {
    nextTick(() => { void openPhotoByQuery() })
})

const closePhotoViewer = () => {
    selectedPhotoIndex.value = null
    if (route.query.photo) {
        const query = { ...route.query }
        delete query.photo
        router.replace({ query })
    }
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
    await openPhotoByQuery()

    if (route.query.edit === '1' && album.value?.permissions?.canEdit) {
        showEditModal.value = true
    }
    if (route.query.upload === 'true' && album.value?.permissions?.canUpload) {
        nextTick(() => {
            triggerFileInput()
        })
    }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
