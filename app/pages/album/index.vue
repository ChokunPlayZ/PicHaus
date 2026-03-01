<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <!-- Navigation Bar -->
        <NavBar title="📸 PicHaus" />

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
            <!-- Header with Actions -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 class="text-3xl font-bold text-white mb-2">My Albums</h2>
                    <p class="text-purple-200">Manage your photo collections</p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button @click="toggleSelectionMode" v-if="filteredAlbums.length > 0"
                        class="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition duration-200 flex items-center justify-center">
                        {{ isSelectionMode ? 'Cancel Selection' : 'Select Albums' }}
                    </button>
                    <button @click="showCreateModal = true"
                        class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 flex-1 sm:flex-none">
                        <span>+</span>
                        <span>Create Album</span>
                    </button>
                </div>
            </div>

            <div v-if="!loading && !error && albums.length > 0"
                class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 mb-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input v-model="searchQuery" type="text"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Search albums by name, description, owner" />
                    <input v-model="tagQuery" type="text"
                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Search tags" />
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button @click="activeTag = ''" class="px-3 py-1 rounded-full border text-xs transition" :class="
                        activeTag === ''
                            ? 'bg-purple-500/30 text-white border-purple-400/50'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    ">
                        All tags
                    </button>
                    <button v-for="tag in visibleTags" :key="`filter-${tag}`" @click="activeTag = tag"
                        class="px-3 py-1 rounded-full border text-xs transition" :class="
                            activeTag === tag
                                ? 'bg-purple-500/30 text-white border-purple-400/50'
                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        ">
                        #{{ tag }}
                    </button>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="text-sm text-purple-200">
                        Showing {{ filteredAlbums.length }} of {{ albums.length }} albums
                    </div>
                    <div class="flex items-center gap-2">
                        <button @click="albumViewMode = 'grid'" class="px-3 py-2 rounded-lg text-sm transition" :class="
                            albumViewMode === 'grid'
                                ? 'bg-purple-500/30 text-white border border-purple-400/50'
                                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                        ">Grid</button>
                        <button @click="albumViewMode = 'timeline'" class="px-3 py-2 rounded-lg text-sm transition"
                            :class="
                                albumViewMode === 'timeline'
                                    ? 'bg-purple-500/30 text-white border border-purple-400/50'
                                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                            ">Timeline</button>
                        <button v-if="searchQuery || tagQuery || activeTag" @click="clearAlbumFilters"
                            class="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-sm transition">
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="text-center py-12">
                <div class="animate-pulse text-purple-300 text-xl">Loading albums...</div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p class="text-red-200">{{ error }}</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="albums.length === 0" class="text-center py-12">
                <div class="text-6xl mb-4">📷</div>
                <h3 class="text-2xl font-bold text-white mb-2">No albums yet</h3>
                <p class="text-purple-200 mb-6">Create your first album to get started</p>
                <button @click="showCreateModal = true"
                    class="px-6 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition">
                    Create Album
                </button>
            </div>

            <div v-else-if="filteredAlbums.length === 0" class="text-center py-12">
                <div class="text-6xl mb-4">🔎</div>
                <h3 class="text-2xl font-bold text-white mb-2">No matching albums</h3>
                <p class="text-purple-200 mb-6">Try a different search or clear filters</p>
                <button @click="clearAlbumFilters"
                    class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition">
                    Clear Filters
                </button>
            </div>

            <!-- Albums Grid -->
            <div v-else-if="albumViewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="album in filteredAlbums" :key="album.id"
                    class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:border-purple-400/50 transition cursor-pointer group relative"
                    :class="{ 'ring-2 ring-purple-500': selectedAlbumIds.has(album.id) }"
                    @click="handleAlbumClick(album, $event)"
                    @contextmenu.prevent="handleAlbumRightClick(album)">

                    <!-- Selection Checkbox -->
                    <div v-if="isSelectionMode" class="absolute top-3 right-3 z-10 transition-transform duration-200"
                        :class="selectedAlbumIds.has(album.id) ? 'scale-110' : 'scale-100'">
                        <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            :class="selectedAlbumIds.has(album.id) ? 'border-purple-500 bg-purple-500' : 'border-white/50'">
                            <svg v-if="selectedAlbumIds.has(album.id)" class="w-4 h-4 text-white" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    <!-- Album Thumbnail -->
                    <div class="aspect-video relative bg-gray-900 group-hover:brightness-110 transition duration-300">
                        <!-- Cover Photo -->
                        <img v-if="album.coverPhoto" :src="buildAssetUrl(`/api/assets/thumb/${album.coverPhoto.id}`)"
                            class="w-full h-full object-cover" loading="lazy" />

                        <!-- Placeholder if no photo -->
                        <div v-else
                            class="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                            <span class="text-6xl grayscale opacity-50">📷</span>
                        </div>

                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    </div>

                    <!-- Album Info -->
                    <div class="p-4">
                        <h3 class="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition truncate">
                            {{ album.name }}
                        </h3>
                        <p v-if="album.description" class="text-purple-200 text-sm mb-3 line-clamp-2">
                            {{ album.description }}
                        </p>
                        <div v-if="album.tags && album.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
                            <span v-for="tag in album.tags" :key="`${album.id}-${tag}`"
                                class="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs border border-white/10">
                                #{{ tag }}
                            </span>
                        </div>
                        <div class="flex items-center justify-between text-sm text-purple-300">
                            <span>{{ album._count.photos }} photos</span>
                            <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                        </div>
                        <div class="mt-2 text-xs text-purple-400">
                            by {{ album.owner.name }}
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="space-y-6">
                <div v-for="group in timelineGroups" :key="group.key" class="space-y-3">
                    <div class="sticky top-2 z-10">
                        <span
                            class="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm text-white">
                            {{ group.label }}
                        </span>
                    </div>
                    <div class="space-y-3">
                        <div v-for="album in group.albums" :key="`${group.key}-${album.id}`"
                            class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 hover:border-purple-400/50 transition cursor-pointer"
                            :class="{ 'ring-2 ring-purple-500': selectedAlbumIds.has(album.id) }"
                            @click="handleAlbumClick(album, $event)" @contextmenu.prevent="handleAlbumRightClick(album)">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <h3 class="text-xl font-bold text-white truncate">{{ album.name }}</h3>
                                    <p v-if="album.description" class="text-purple-200 text-sm mt-1 line-clamp-2">{{
                                        album.description }}</p>
                                    <div v-if="album.tags && album.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                                        <span v-for="tag in album.tags" :key="`${album.id}-${group.key}-${tag}`"
                                            class="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs border border-white/10">
                                            #{{ tag }}
                                        </span>
                                    </div>
                                    <div class="mt-2 text-xs text-purple-400">by {{ album.owner.name }}</div>
                                </div>
                                <div class="text-right text-sm text-purple-300 shrink-0">
                                    <div>{{ album._count.photos }} photos</div>
                                    <div v-if="album.eventDate">{{ formatDate(album.eventDate) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Selection Action Bar -->
        <div v-if="selectedAlbumIds.size > 0"
            class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40 max-w-[90vw]">
            <div class="text-white font-medium border-r border-white/20 pr-4 whitespace-nowrap">
                {{ selectedAlbumIds.size }} selected
            </div>

            <button @click="clearSelection" class="text-white/60 hover:text-white transition text-sm">
                Clear
            </button>

            <div class="h-6 w-px bg-white/20"></div>

            <button @click="openBatchEditModal"
                class="flex items-center gap-2 text-white hover:text-purple-300 transition whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Batch Edit</span>
            </button>

            <button @click="showShareGroupModal = true"
                class="flex items-center gap-2 text-white hover:text-purple-300 transition whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share Group</span>
            </button>
        </div>

        <!-- Create Album Modal -->
        <div v-if="showCreateModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="showCreateModal = false">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <h3 class="text-2xl font-bold text-white mb-4">Create New Album</h3>

                <form @submit.prevent="handleCreateAlbum" class="space-y-4">
                    <!-- Album Name -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Album Name *</label>
                        <input v-model="newAlbum.name" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Summer Vacation 2024" />
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Description</label>
                        <textarea v-model="newAlbum.description" rows="3"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="Tell us about this album..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Tags</label>
                        <input v-model="newAlbum.tags" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="wedding, portrait, night" />
                        <p class="text-xs text-white/50 mt-1">Separate tags with commas</p>
                    </div>

                    <!-- Event Date -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Event Date</label>
                        <input v-model="newAlbum.eventDate" type="date"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>

                    <!-- Public/Private -->
                    <div class="flex items-center">
                        <input v-model="newAlbum.isPublic" type="checkbox" id="isPublic"
                            class="w-4 h-4 text-purple-600 bg-white/5 border-white/10 rounded focus:ring-purple-500" />
                        <label for="isPublic" class="ml-2 text-sm text-purple-200">Make album public</label>
                    </div>

                    <!-- Error Message -->
                    <div v-if="createError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ createError }}</p>
                    </div>

                    <!-- Buttons -->
                    <div class="flex space-x-3">
                        <button type="button" @click="showCreateModal = false"
                            class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                            Cancel
                        </button>
                        <button type="submit" :disabled="creating"
                            class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ creating ? 'Creating...' : 'Create' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Create Share Group Modal -->
        <div v-if="showShareGroupModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="showShareGroupModal = false">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <h3 class="text-2xl font-bold text-white mb-4">Create Share Group</h3>
                <p class="text-purple-200 text-sm mb-4">Share {{ selectedAlbumIds.size }} albums with a single link.</p>

                <form @submit.prevent="handleCreateShareGroup" class="space-y-4">
                    <!-- Group Title -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Group Title *</label>
                        <input v-model="newShareGroup.title" type="text" required
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="My Portfolio" />
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Description</label>
                        <textarea v-model="newShareGroup.description" rows="3"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="A collection of my best work..."></textarea>
                    </div>

                    <!-- Password (Optional) -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Password (Optional)</label>
                        <input v-model="newShareGroup.password" type="password"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Leave empty for no password" />
                    </div>

                    <!-- Link Label (Optional) -->
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Link Label (Optional)</label>
                        <input v-model="newShareGroup.label" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. For Family" />
                    </div>

                    <!-- Error Message -->
                    <div v-if="shareGroupError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ shareGroupError }}</p>
                    </div>

                    <!-- Buttons -->
                    <div class="flex space-x-3">
                        <button type="button" @click="showShareGroupModal = false"
                            class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                            Cancel
                        </button>
                        <button type="submit" :disabled="creatingShareGroup"
                            class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ creatingShareGroup ? 'Creating...' : 'Create Link' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Share Link Success Modal -->
        <div v-if="createdShareLink"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="createdShareLink = null">
            <div
                class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full text-center">
                <div
                    class="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">Group Link Created!</h3>
                <p class="text-purple-200 mb-6">Your albums are now ready to be shared.</p>

                <div
                    class="bg-white/5 rounded-lg p-4 border border-white/10 mb-6 flex items-center justify-between gap-2">
                    <code class="text-sm text-purple-300 truncate">{{ createdShareLink }}</code>
                    <button @click="copyToClipboard(createdShareLink!)" class="text-white hover:text-purple-300">
                        <span v-if="copied" class="text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>

                <button @click="createdShareLink = null; clearSelection(); isSelectionMode = false"
                    class="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                    Done
                </button>
            </div>
        </div>

        <div v-if="showBatchEditModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            @click.self="showBatchEditModal = false">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 max-w-md w-full">
                <h3 class="text-2xl font-bold text-white mb-2">Batch Edit Albums</h3>
                <p class="text-sm text-purple-200 mb-4">Apply changes to {{ selectedAlbumIds.size }} selected albums</p>

                <form @submit.prevent="handleBatchEditAlbums" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Visibility</label>
                        <select v-model="batchEdit.visibilityAction"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="keep">Keep unchanged</option>
                            <option value="public">Make public</option>
                            <option value="private">Make private</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-purple-200 mb-2">Tag Action</label>
                        <select v-model="batchEdit.tagAction"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="none">Keep unchanged</option>
                            <option value="replace">Replace tags</option>
                            <option value="add">Add tags</option>
                            <option value="remove">Remove tags</option>
                        </select>
                    </div>

                    <div v-if="batchEdit.tagAction !== 'none'">
                        <label class="block text-sm font-medium text-purple-200 mb-2">Tags</label>
                        <input v-model="batchEdit.tags" type="text"
                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="wedding, portrait, night" />
                        <p class="text-xs text-white/50 mt-1">Separate tags with commas</p>
                    </div>

                    <div v-if="batchEditError" class="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p class="text-red-200 text-sm">{{ batchEditError }}</p>
                    </div>

                    <div class="flex space-x-3">
                        <button type="button" @click="showBatchEditModal = false"
                            class="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition">
                            Cancel
                        </button>
                        <button type="submit" :disabled="batchEditing"
                            class="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--btn-primary-start)] to-[var(--btn-primary-end)] hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                            {{ batchEditing ? 'Applying...' : 'Apply' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { clearAuthToken, buildAssetUrl } from '~/utils/auth-client'

interface Album {
    id: string
    name: string
    description: string | null
    tags: string[]
    eventDate: number | null
    createdAt?: number
    updatedAt?: number
    isPublic: boolean
    owner: {
        name: string | null
    }
    _count: {
        photos: number
    }
    coverPhoto?: {
        id: string
        blurhash: string | null
    } | null
}

const user = ref<any>(null)
const albums = ref<Album[]>([])
const loading = ref(true)
const error = ref('')

const showCreateModal = ref(false)
const newAlbum = ref({
    name: '',
    description: '',
    tags: '',
    eventDate: '',
    isPublic: false,
})
const creating = ref(false)
const createError = ref('')

// Selection & Share Group State
const isSelectionMode = ref(false)
const selectedAlbumIds = ref<Set<string>>(new Set())
const showShareGroupModal = ref(false)
const newShareGroup = ref({
    title: '',
    description: '',
    password: '',
    label: ''
})
const creatingShareGroup = ref(false)
const shareGroupError = ref('')
const createdShareLink = ref<string | null>(null)
const showBatchEditModal = ref(false)
const batchEdit = ref({
    visibilityAction: 'keep' as 'keep' | 'public' | 'private',
    tagAction: 'none' as 'none' | 'replace' | 'add' | 'remove',
    tags: '',
})
const batchEditing = ref(false)
const batchEditError = ref('')
const searchQuery = ref('')
const tagQuery = ref('')
const activeTag = ref('')
const albumViewMode = ref<'grid' | 'timeline'>('grid')

const allTags = computed(() => {
    const tags = albums.value.flatMap(album => album.tags || [])
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b))
})

const visibleTags = computed(() => {
    const query = tagQuery.value.trim().toLowerCase()
    if (!query) return allTags.value
    return allTags.value.filter(tag => tag.toLowerCase().includes(query))
})

const filteredAlbums = computed(() => {
    const search = searchQuery.value.trim().toLowerCase()
    const selectedTag = activeTag.value.trim().toLowerCase()
    const tagSearch = tagQuery.value.trim().toLowerCase()

    return albums.value.filter((album) => {
        const name = album.name?.toLowerCase() || ''
        const description = album.description?.toLowerCase() || ''
        const owner = album.owner.name?.toLowerCase() || ''
        const tags = (album.tags || []).map(tag => tag.toLowerCase())

        const matchesSearch = !search ||
            name.includes(search) ||
            description.includes(search) ||
            owner.includes(search) ||
            tags.some(tag => tag.includes(search))

        const matchesSelectedTag = !selectedTag || tags.includes(selectedTag)
        const matchesTagSearch = !tagSearch || tags.some(tag => tag.includes(tagSearch))

        return matchesSearch && matchesSelectedTag && matchesTagSearch
    })
})

const timelineGroups = computed(() => {
    const groups = new Map<string, Album[]>()

    filteredAlbums.value.forEach((album) => {
        const timestamp = album.eventDate || album.createdAt || album.updatedAt || 0
        const date = timestamp > 0 ? new Date(timestamp * 1000) : null
        const key = !date || isNaN(date.getTime())
            ? 'Unknown Date'
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key)?.push(album)
    })

    return Array.from(groups.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, groupedAlbums]) => {
            const label = key === 'Unknown Date'
                ? key
                : new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                })

            return {
                key,
                label,
                albums: groupedAlbums.sort((a, b) => {
                    const aTs = a.eventDate || a.createdAt || a.updatedAt || 0
                    const bTs = b.eventDate || b.createdAt || b.updatedAt || 0
                    return bTs - aTs
                })
            }
        })
})

const clearAlbumFilters = () => {
    searchQuery.value = ''
    tagQuery.value = ''
    activeTag.value = ''
}

const parseTagsInput = (value: string): string[] => {
    const tags = value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

    return Array.from(new Set(tags))
}

// Check authentication
const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
    } catch (err) {
        await navigateTo('/login')
    }
}

// Fetch albums
const fetchAlbums = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: Album[] }>('/api/v1/album')
        albums.value = response.data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to load albums'
    } finally {
        loading.value = false
    }
}

// Selection Logic
const toggleSelectionMode = () => {
    isSelectionMode.value = !isSelectionMode.value
    if (!isSelectionMode.value) {
        clearSelection()
    }
}

const handleAlbumClick = (album: Album, event?: MouseEvent) => {
    const isQuickSelect = !!event && (event.metaKey || event.ctrlKey)

    if (isQuickSelect) {
        isSelectionMode.value = true
    }

    if (isSelectionMode.value || isQuickSelect) {
        if (selectedAlbumIds.value.has(album.id)) {
            selectedAlbumIds.value.delete(album.id)
        } else {
            selectedAlbumIds.value.add(album.id)
        }
    } else {
        navigateTo(`/album/${album.id}`)
    }
}

const handleAlbumRightClick = (album: Album) => {
    if (isSelectionMode.value) return
    navigateTo(`/album/${album.id}?edit=1`)
}

const clearSelection = () => {
    selectedAlbumIds.value.clear()
}

const openBatchEditModal = () => {
    batchEditError.value = ''
    showBatchEditModal.value = true
}

const handleBatchEditAlbums = async () => {
    batchEditing.value = true
    batchEditError.value = ''

    try {
        const albumIds = Array.from(selectedAlbumIds.value)
        const tags = parseTagsInput(batchEdit.value.tags)

        if (albumIds.length === 0) {
            throw new Error('Select at least one album')
        }

        if (batchEdit.value.tagAction !== 'none' && tags.length === 0) {
            throw new Error('Enter at least one tag for the selected tag action')
        }

        if (batchEdit.value.visibilityAction === 'keep' && batchEdit.value.tagAction === 'none') {
            throw new Error('Choose at least one change to apply')
        }

        await $fetch('/api/v1/album/batch', {
            method: 'PATCH',
            body: {
                albumIds,
                visibilityAction: batchEdit.value.visibilityAction,
                tagAction: batchEdit.value.tagAction,
                tags,
            }
        })

        showBatchEditModal.value = false
        batchEdit.value = {
            visibilityAction: 'keep',
            tagAction: 'none',
            tags: '',
        }
        clearSelection()
        isSelectionMode.value = false
        await fetchAlbums()
    } catch (err: any) {
        batchEditError.value = err?.data?.statusMessage || err.message || 'Failed to batch edit albums'
    } finally {
        batchEditing.value = false
    }
}

// Create album
const handleCreateAlbum = async () => {
    creating.value = true
    createError.value = ''

    try {
        const eventDate = newAlbum.value.eventDate
            ? Math.floor(new Date(newAlbum.value.eventDate).getTime() / 1000)
            : null

        await $fetch('/api/v1/album/create', {
            method: 'POST',
            body: {
                name: newAlbum.value.name,
                description: newAlbum.value.description || null,
                tags: parseTagsInput(newAlbum.value.tags),
                eventDate,
                isPublic: newAlbum.value.isPublic,
            },
        })

        // Reset form and close modal
        newAlbum.value = { name: '', description: '', tags: '', eventDate: '', isPublic: false }
        showCreateModal.value = false

        // Refresh albums list
        await fetchAlbums()
    } catch (err: any) {
        createError.value = err.data?.statusMessage || 'Failed to create album'
    } finally {
        creating.value = false
    }
}

// Create Share Group
const handleCreateShareGroup = async () => {
    creatingShareGroup.value = true
    shareGroupError.value = ''

    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/share-group/create', {
            method: 'POST',
            body: {
                title: newShareGroup.value.title,
                description: newShareGroup.value.description || null,
                albumIds: Array.from(selectedAlbumIds.value),
                password: newShareGroup.value.password || undefined,
                label: newShareGroup.value.label || undefined
            }
        })

        showShareGroupModal.value = false
        newShareGroup.value = { title: '', description: '', password: '', label: '' }

        // Show success modal with link
        createdShareLink.value = `${window.location.origin}${response.data.link.url}`
    } catch (err: any) {
        shareGroupError.value = err.data?.statusMessage || 'Failed to create share group'
    } finally {
        creatingShareGroup.value = false
    }
}

const copied = ref(false)

const copyToClipboard = async (text: string) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
        } else {
            // Fallback
            const textArea = document.createElement("textarea")
            textArea.value = text

            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            textArea.style.top = "0"
            document.body.appendChild(textArea)

            textArea.focus()
            textArea.select()

            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)

            if (!successful) {
                throw new Error('Unable to copy')
            }
        }

        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy', err)
        alert('Failed to copy link manually: ' + text)
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

// Initialize
onMounted(async () => {
    await checkAuth()
    await fetchAlbums()
})
</script>
