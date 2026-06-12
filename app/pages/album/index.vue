<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="PicHaus" />

        <div class="px-4 sm:px-6 lg:px-8 py-8 pb-32">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--text-1);">My Albums</h2>
                    <p class="text-sm" style="color: var(--text-2);">Manage your photo collections</p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button @click="toggleSelectionMode" v-if="filteredAlbums.length > 0"
                        class="px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        {{ isSelectionMode ? 'Cancel' : 'Select' }}
                    </button>
                    <button @click="openTagGroupModal"
                        class="px-4 py-2.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>Group Link</span>
                    </button>
                    <button @click="showCreateModal = true"
                        class="px-5 py-2.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                        style="background: var(--accent); color: var(--accent-text);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>New Album</span>
                    </button>
                </div>
            </div>

            <!-- Filter panel -->
            <div v-if="!loading && !error && albums.length > 0"
                class="rounded-2xl p-4 mb-6 space-y-3"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input v-model="searchQuery" type="text"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="Search albums…"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    <input v-model="tagQuery" type="text"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        placeholder="Filter by tag…"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                </div>

                <div class="flex flex-wrap items-center gap-1.5">
                    <button @click="activeTag = ''"
                        class="px-3 py-1 rounded-full text-xs font-medium transition"
                        :style="activeTag === '' ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--surface-3); color: var(--text-2);'">
                        All
                    </button>
                    <button v-for="tag in visibleTags" :key="`filter-${tag}`" @click="activeTag = tag"
                        class="px-3 py-1 rounded-full text-xs font-medium transition"
                        :style="activeTag === tag ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--surface-3); color: var(--text-2);'">
                        #{{ tag }}
                    </button>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="text-xs" style="color: var(--text-3);">
                        {{ filteredAlbums.length }} of {{ albums.length }} albums
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button @click="albumViewMode = 'grid'"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            :style="albumViewMode === 'grid' ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--surface-3); color: var(--text-2);'">
                            Grid
                        </button>
                        <button @click="albumViewMode = 'timeline'"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            :style="albumViewMode === 'timeline' ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--surface-3); color: var(--text-2);'">
                            Timeline
                        </button>
                        <button v-if="searchQuery || tagQuery || activeTag" @click="clearAlbumFilters"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            style="background: var(--surface-3); color: var(--text-2);">
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-16">
                <div class="w-8 h-8 rounded-full border-2 animate-spin mx-auto"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                <p class="mt-4 text-sm" style="color: var(--text-3);">Loading albums…</p>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="rounded-xl px-4 py-3 text-sm"
                style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                {{ error }}
            </div>

            <!-- Empty: no albums -->
            <div v-else-if="albums.length === 0" class="text-center py-20">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                    style="background: var(--surface-3);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                </div>
                <h3 class="text-xl font-semibold mb-2" style="color: var(--text-1);">No albums yet</h3>
                <p class="text-sm mb-6" style="color: var(--text-2);">Create your first album to get started</p>
                <button @click="showCreateModal = true"
                    class="px-5 py-2.5 rounded-full text-sm font-medium transition"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    Create Album
                </button>
            </div>

            <!-- Empty: no filter results -->
            <div v-else-if="filteredAlbums.length === 0" class="text-center py-20">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                    style="background: var(--surface-3);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <h3 class="text-xl font-semibold mb-2" style="color: var(--text-1);">No matching albums</h3>
                <p class="text-sm mb-6" style="color: var(--text-2);">Try a different search or clear filters</p>
                <button @click="clearAlbumFilters"
                    class="px-5 py-2.5 rounded-full text-sm font-medium transition"
                    style="background: var(--surface-3); color: var(--text-1);">
                    Clear Filters
                </button>
            </div>

            <!-- Grid view -->
            <div v-else-if="albumViewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div v-for="album in filteredAlbums" :key="album.id"
                    class="rounded-2xl overflow-hidden cursor-pointer group relative transition-shadow"
                    :style="selectedAlbumIds.has(album.id) ? 'background: var(--surface-1); border: 2px solid var(--accent); box-shadow: var(--shadow-md);' : 'background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);'"
                    @click="handleAlbumClick(album, $event)"
                    @contextmenu.prevent="handleAlbumRightClick(album, $event)"
                    @mouseover="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.boxShadow = selectedAlbumIds.has(album.id) ? 'var(--shadow-md)' : 'var(--shadow-sm)'">

                    <!-- Selection badge -->
                    <div v-if="isSelectionMode" class="absolute top-3 right-3 z-10">
                        <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                            :style="selectedAlbumIds.has(album.id) ? 'background: var(--accent); border-color: var(--accent);' : 'background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.2);'">
                            <svg v-if="selectedAlbumIds.has(album.id)" class="w-3.5 h-3.5" fill="none"
                                viewBox="0 0 24 24" stroke="white" stroke-width="3">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    <!-- Thumbnail -->
                    <div class="aspect-video relative overflow-hidden" style="background: var(--surface-3);">
                        <template v-if="album.coverPhoto">
                            <div v-if="album.coverPhoto.blurhash" class="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
                                :style="{ backgroundImage: `url(${computeBlurhash(album.coverPhoto.blurhash)})` }" />
                            <img :src="buildAssetUrl(`/api/assets/thumb/${album.coverPhoto.id}`)"
                                class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                                loading="lazy"
                                @load="($event.target as HTMLElement).style.opacity = '1'"
                                style="opacity: 0;" />
                        </template>
                        <div v-else class="w-full h-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                    d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                            </svg>
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="p-4">
                        <h3 class="font-semibold text-base mb-1 truncate" style="color: var(--text-1);">
                            {{ album.name }}
                        </h3>
                        <p v-if="album.description" class="text-sm mb-2 line-clamp-2" style="color: var(--text-2);">
                            {{ album.description }}
                        </p>
                        <div v-if="album.tags && album.tags.length > 0" class="flex flex-wrap gap-1 mb-2">
                            <span v-for="tag in album.tags" :key="`${album.id}-${tag}`"
                                class="px-2 py-0.5 rounded-full text-xs"
                                style="background: var(--surface-3); color: var(--text-2);">
                                #{{ tag }}
                            </span>
                        </div>
                        <div class="flex items-center justify-between text-xs" style="color: var(--text-3);">
                            <span>{{ album._count.photos }} photos · by {{ album.owner.name }}</span>
                            <span v-if="album.eventDate">{{ formatDate(album.eventDate) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Timeline view -->
            <div v-else class="space-y-8">
                <div v-for="group in timelineGroups" :key="group.key" class="space-y-3">
                    <div class="sticky top-2 z-10">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                            style="background: var(--surface-1); border: 1px solid var(--separator); color: var(--text-2); box-shadow: var(--shadow-sm);">
                            {{ group.label }}
                        </span>
                    </div>
                    <div class="space-y-2">
                        <div v-for="album in group.albums" :key="`${group.key}-${album.id}`"
                            class="rounded-xl p-4 cursor-pointer transition-shadow"
                            :style="selectedAlbumIds.has(album.id) ? 'background: var(--surface-1); border: 2px solid var(--accent); box-shadow: var(--shadow-sm);' : 'background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);'"
                            @click="handleAlbumClick(album, $event)"
                            @contextmenu.prevent="handleAlbumRightClick(album, $event)"
                            @mouseover="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'"
                            @mouseout="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <h3 class="font-semibold text-base truncate" style="color: var(--text-1);">{{ album.name }}</h3>
                                    <p v-if="album.description" class="text-sm mt-0.5 line-clamp-1" style="color: var(--text-2);">{{ album.description }}</p>
                                    <div v-if="album.tags && album.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                                        <span v-for="tag in album.tags" :key="`${album.id}-${group.key}-${tag}`"
                                            class="px-2 py-0.5 rounded-full text-xs"
                                            style="background: var(--surface-3); color: var(--text-2);">
                                            #{{ tag }}
                                        </span>
                                    </div>
                                    <div class="mt-1.5 text-xs" style="color: var(--text-3);">by {{ album.owner.name }}</div>
                                </div>
                                <div class="text-right text-xs shrink-0" style="color: var(--text-3);">
                                    <div>{{ album._count.photos }} photos</div>
                                    <div v-if="album.eventDate" class="mt-0.5">{{ formatDate(album.eventDate) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Selection action bar -->
        <div v-if="selectedAlbumIds.size > 0"
            class="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full px-5 py-3 flex items-center gap-4 z-40 max-w-[90vw]"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
            <div class="text-sm font-medium pr-4" style="color: var(--text-1); border-right: 1px solid var(--separator);">
                {{ selectedAlbumIds.size }} selected
            </div>
            <button @click="clearSelection" class="text-sm transition" style="color: var(--text-2);">Clear</button>
            <div class="w-px h-4" style="background: var(--separator);"></div>
            <button @click="openBatchEditModal"
                class="flex items-center gap-1.5 text-sm font-medium transition"
                style="color: var(--text-1);">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Batch Edit
            </button>
            <button @click="showShareGroupModal = true"
                class="flex items-center gap-1.5 text-sm font-medium transition"
                style="color: var(--accent);">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Group
            </button>
        </div>

        <!-- Create Album Modal -->
        <div v-if="showCreateModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showCreateModal = false">
            <div class="rounded-2xl p-6 max-w-md w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-xl font-semibold mb-5" style="color: var(--text-1);">New Album</h3>

                <form @submit.prevent="handleCreateAlbum" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Album Name</label>
                        <input v-model="newAlbum.name" type="text" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Summer Vacation 2024"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Description</label>
                        <textarea v-model="newAlbum.description" rows="3"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Tell us about this album…"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Tags</label>
                        <input v-model="newAlbum.tags" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="wedding, portrait, night"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        <p class="text-xs mt-1" style="color: var(--text-3);">Separate with commas</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Event Date</label>
                        <input v-model="newAlbum.eventDate" type="date"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <label class="flex items-center gap-2.5 cursor-pointer">
                        <input v-model="newAlbum.isPublic" type="checkbox" class="w-4 h-4 rounded"
                            style="accent-color: var(--accent);" />
                        <span class="text-sm" style="color: var(--text-1);">Make album public</span>
                    </label>

                    <div v-if="createError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ createError }}
                    </div>

                    <div class="flex gap-3 pt-1">
                        <button type="button" @click="showCreateModal = false"
                            class="flex-1 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-3); color: var(--text-1);">Cancel</button>
                        <button type="submit" :disabled="creating"
                            class="flex-1 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!creating && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ creating ? 'Creating…' : 'Create' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Create Share Group Modal -->
        <div v-if="showShareGroupModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showShareGroupModal = false">
            <div class="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-xl font-semibold mb-1" style="color: var(--text-1);">Create Group Link</h3>
                <p class="text-sm mb-5" style="color: var(--text-2);">
                    <span v-if="selectedAlbumIds.size > 0">{{ selectedAlbumIds.size }} album{{ selectedAlbumIds.size !== 1 ? 's' : '' }} selected. You can also add tag filters below.</span>
                    <span v-else>No albums selected — use tag filters to include albums dynamically.</span>
                </p>

                <form @submit.prevent="handleCreateShareGroup" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Group Title</label>
                        <input v-model="newShareGroup.title" type="text" required
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="My Portfolio"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Description</label>
                        <textarea v-model="newShareGroup.description" rows="2"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="A collection of my best work…"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1" style="color: var(--text-1);">Tag Filters</label>
                        <p class="text-xs mb-1.5" style="color: var(--text-3);">Albums matching any of these tags are included automatically.</p>
                        <input v-model="newShareGroup.tags" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="wedding, portrait (comma-separated)"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <!-- Theme swatches -->
                    <div>
                        <label class="block text-sm font-medium mb-2" style="color: var(--text-1);">Theme</label>
                        <div class="flex flex-wrap gap-2 items-center">
                            <button v-for="(theme, key) in ALBUM_THEMES" :key="key" type="button"
                                @click="newShareGroup.themePreset = key" :title="theme.label"
                                class="w-7 h-7 rounded-full border-2 transition"
                                :style="`background: linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd}); border-color: ${newShareGroup.themePreset === key ? 'var(--accent)' : 'transparent'};`" />
                            <button type="button" @click="newShareGroup.themePreset = 'custom'" title="Custom"
                                class="w-7 h-7 rounded-full border-2 transition text-xs font-bold"
                                :style="`background: var(--surface-3); color: var(--text-2); border-color: ${newShareGroup.themePreset === 'custom' ? 'var(--accent)' : 'var(--separator)'};`">+</button>
                            <button type="button" @click="newShareGroup.themePreset = ''" title="Default"
                                class="px-2 h-7 rounded-full border-2 transition text-xs font-medium"
                                :style="`background: var(--surface-3); color: var(--text-2); border-color: ${newShareGroup.themePreset === '' ? 'var(--accent)' : 'var(--separator)'};`">Default</button>
                        </div>
                        <div v-if="newShareGroup.themePreset === 'custom'" class="mt-3 grid grid-cols-2 gap-2">
                            <div v-for="(label, key) in { bgStart: 'BG Start', bgEnd: 'BG End', btnStart: 'Accent Start', btnEnd: 'Accent End' }" :key="key">
                                <label class="text-xs mb-1 block" style="color: var(--text-2);">{{ label }}</label>
                                <input type="color" v-model="(newShareGroup.customTheme as any)[key]" class="w-full h-8 rounded-lg cursor-pointer" style="border: 1px solid var(--separator);" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Logo Text</label>
                        <input v-model="newShareGroup.logoText" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Wedding Collection 2025"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Password (Optional)</label>
                        <input v-model="newShareGroup.password" type="password"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="Leave empty for no password"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Label (Optional)</label>
                        <input v-model="newShareGroup.label" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="e.g. For Family"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <div v-if="shareGroupError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ shareGroupError }}
                    </div>

                    <div class="flex gap-3 pt-1">
                        <button type="button" @click="showShareGroupModal = false"
                            class="flex-1 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-3); color: var(--text-1);">Cancel</button>
                        <button type="submit" :disabled="creatingShareGroup"
                            class="flex-1 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!creatingShareGroup && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ creatingShareGroup ? 'Creating…' : 'Create Link' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Share Link Success Modal -->
        <div v-if="createdShareLink"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="createdShareLink = null">
            <div class="rounded-2xl p-6 max-w-md w-full text-center"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style="background: var(--success-bg);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" style="color: var(--success);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 class="text-xl font-semibold mb-1" style="color: var(--text-1);">Link Created!</h3>
                <p class="text-sm mb-5" style="color: var(--text-2);">Your albums are now ready to share.</p>

                <div class="rounded-xl p-3 flex items-center justify-between gap-2 mb-5"
                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <code class="text-xs truncate" style="color: var(--text-2);">{{ createdShareLink }}</code>
                    <button @click="copyToClipboard(createdShareLink!)"
                        class="ml-2 flex-shrink-0 transition"
                        :style="copied ? 'color: var(--success)' : 'color: var(--text-3)'">
                        <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>

                <button @click="createdShareLink = null; clearSelection(); isSelectionMode = false"
                    class="w-full py-2.5 rounded-full text-sm font-medium transition"
                    style="background: var(--surface-3); color: var(--text-1);">Done</button>
            </div>
        </div>

        <!-- Batch Edit Modal -->
        <div v-if="showBatchEditModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showBatchEditModal = false">
            <div class="rounded-2xl p-6 max-w-md w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-xl font-semibold mb-1" style="color: var(--text-1);">Batch Edit</h3>
                <p class="text-sm mb-5" style="color: var(--text-2);">Apply to {{ selectedAlbumIds.size }} selected albums</p>

                <form @submit.prevent="handleBatchEditAlbums" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Visibility</label>
                        <select v-model="batchEdit.visibilityAction"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                            <option value="keep">Keep unchanged</option>
                            <option value="public">Make public</option>
                            <option value="private">Make private</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Tag Action</label>
                        <select v-model="batchEdit.tagAction"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;">
                            <option value="none">Keep unchanged</option>
                            <option value="replace">Replace tags</option>
                            <option value="add">Add tags</option>
                            <option value="remove">Remove tags</option>
                        </select>
                    </div>
                    <div v-if="batchEdit.tagAction !== 'none'">
                        <label class="block text-sm font-medium mb-1.5" style="color: var(--text-1);">Tags</label>
                        <input v-model="batchEdit.tags" type="text"
                            class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                            style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                            placeholder="wedding, portrait, night"
                            @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                            @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                    </div>

                    <div v-if="batchEditError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ batchEditError }}
                    </div>

                    <div class="flex gap-3 pt-1">
                        <button type="button" @click="showBatchEditModal = false"
                            class="flex-1 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-3); color: var(--text-1);">Cancel</button>
                        <button type="submit" :disabled="batchEditing"
                            class="flex-1 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!batchEditing && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ batchEditing ? 'Applying…' : 'Apply' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Album Context Menu -->
    <Teleport to="body">
        <div v-if="albumContextMenu.visible"
            class="fixed z-[70] rounded-xl py-1.5 w-52"
            style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-lg);"
            :style="{ top: `${albumContextMenu.y}px`, left: `${albumContextMenu.x}px` }"
            @click.stop>
            <button @click="navigateTo(`/album/${albumContextMenu.album!.id}`); closeAlbumContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg"
                style="color: var(--text-1); margin: 0 4px; width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Album
            </button>
            <button @click="navigateTo(`/album/${albumContextMenu.album!.id}?edit=1`); closeAlbumContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg"
                style="color: var(--text-1); margin: 0 4px; width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Album
            </button>
            <button @click="toggleAlbumSelection(albumContextMenu.album!.id); closeAlbumContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg"
                style="color: var(--text-1); margin: 0 4px; width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select
            </button>
            <div class="h-px my-1 mx-3" style="background: var(--separator);"></div>
            <button @click="deleteAlbumFromMenu(albumContextMenu.album!.id); closeAlbumContextMenu()"
                class="w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 rounded-lg"
                style="color: var(--error); margin: 0 4px; width: calc(100% - 8px);"
                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Album
            </button>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { clearAuthToken, buildAssetUrl } from '~/utils/auth-client'
import { ALBUM_THEMES } from '~/composables/useAlbumTheme'
import { blurhashToDataUrl } from '~/composables/useBlurhash'

const computeBlurhash = (hash: string) => import.meta.client ? blurhashToDataUrl(hash) : ''

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

const isSelectionMode = ref(false)
const selectedAlbumIds = ref<Set<string>>(new Set())
const showShareGroupModal = ref(false)
const newShareGroup = ref({
    title: '',
    description: '',
    password: '',
    label: '',
    tags: '',
    themePreset: '',
    customTheme: { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' },
    logoText: '',
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

const checkAuth = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
        user.value = response.data
    } catch (err) {
        await navigateTo('/login')
    }
}

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

const albumContextMenu = reactive({
    visible: false,
    x: 0,
    y: 0,
    album: null as Album | null,
})

const closeAlbumContextMenu = () => {
    albumContextMenu.visible = false
}

const handleAlbumRightClick = (album: Album, event?: MouseEvent) => {
    if (isSelectionMode.value) return
    const e = event as MouseEvent
    const menuWidth = 208
    const menuHeight = 180
    let x = e.clientX
    let y = e.clientY
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8
    albumContextMenu.visible = true
    albumContextMenu.x = x
    albumContextMenu.y = y
    albumContextMenu.album = album
}

const toggleAlbumSelection = (albumId: string) => {
    isSelectionMode.value = true
    if (selectedAlbumIds.value.has(albumId)) {
        selectedAlbumIds.value.delete(albumId)
    } else {
        selectedAlbumIds.value.add(albumId)
    }
}

const deleteAlbumFromMenu = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) return
    try {
        await $fetch(`/api/v1/album/${albumId}`, { method: 'DELETE' })
        albums.value = albums.value.filter(a => a.id !== albumId)
    } catch (err: any) {
        alert(err.data?.statusMessage || 'Failed to delete album')
    }
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

        newAlbum.value = { name: '', description: '', tags: '', eventDate: '', isPublic: false }
        showCreateModal.value = false
        await fetchAlbums()
    } catch (err: any) {
        createError.value = err.data?.statusMessage || 'Failed to create album'
    } finally {
        creating.value = false
    }
}

const openTagGroupModal = () => {
    shareGroupError.value = ''
    showShareGroupModal.value = true
}

const handleCreateShareGroup = async () => {
    creatingShareGroup.value = true
    shareGroupError.value = ''

    try {
        const tags = parseTagsInput(newShareGroup.value.tags)
        const albumIds = Array.from(selectedAlbumIds.value)
        const customTheme = newShareGroup.value.themePreset === 'custom'
            ? JSON.stringify(newShareGroup.value.customTheme)
            : undefined

        const response = await $fetch<{ success: boolean; data: any }>('/api/v1/share-group/create', {
            method: 'POST',
            body: {
                title: newShareGroup.value.title,
                description: newShareGroup.value.description || null,
                albumIds,
                tags,
                password: newShareGroup.value.password || undefined,
                label: newShareGroup.value.label || undefined,
                themePreset: newShareGroup.value.themePreset || undefined,
                customTheme,
                logoText: newShareGroup.value.logoText || undefined,
            }
        })

        showShareGroupModal.value = false
        newShareGroup.value = { title: '', description: '', password: '', label: '', tags: '', themePreset: '', customTheme: { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' }, logoText: '' }
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
            if (!successful) throw new Error('Unable to copy')
        }
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    } catch (err) {
        console.error('Failed to copy', err)
        alert('Failed to copy link manually: ' + text)
    }
}

const handleLogout = async () => {
    try {
        await $fetch('/api/v1/auth/logout', { method: 'POST' })
        clearAuthToken()
        await navigateTo('/login')
    } catch (err) {
        console.error('Logout error:', err)
    }
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

onMounted(async () => {
    await checkAuth()
    await fetchAlbums()
    document.addEventListener('click', closeAlbumContextMenu)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAlbumContextMenu() })
})

onUnmounted(() => {
    document.removeEventListener('click', closeAlbumContextMenu)
})
</script>
