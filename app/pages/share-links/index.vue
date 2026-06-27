<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="Share Links" :showBack="true" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <h2 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--text-1);">Share Links</h2>
                <p class="text-sm" style="color: var(--text-2);">Manage your shared albums and groups</p>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex justify-center py-12">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="rounded-xl px-4 py-3 text-sm mb-8"
                style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                {{ error }}
            </div>

            <!-- Empty State -->
            <div v-else-if="links.length === 0" class="text-center py-16 rounded-2xl"
                style="background: var(--surface-1); border: 1px solid var(--separator);">
                <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style="background: var(--surface-3);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
                <h3 class="text-lg font-semibold mb-1" style="color: var(--text-1);">No share links yet</h3>
                <p class="text-sm mb-6" style="color: var(--text-3);">Create a share link from your albums to see it here.</p>
                <button @click="navigateTo('/album')"
                    class="px-6 py-2.5 rounded-full text-sm font-medium transition"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    Go to Albums
                </button>
            </div>

            <!-- Links Table -->
            <div v-else class="rounded-2xl overflow-hidden"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr style="background: var(--surface-2); border-bottom: 1px solid var(--separator);">
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Link Label</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Target</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Type</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-center" style="color: var(--text-3);">Views</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Created</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="link in links" :key="link.id" class="transition"
                                style="border-top: 1px solid var(--separator);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2 font-medium" style="color: var(--text-1);">
                                        <svg v-if="link.hasPassword" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: var(--text-3);">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        {{ link.label || 'No Label' }}
                                    </div>
                                    <div class="flex flex-wrap items-center gap-2 mt-1">
                                        <div class="text-xs font-mono truncate max-w-[200px]" style="color: var(--text-3);">
                                            {{ getFullUrl(link.url) }}
                                        </div>
                                        <span v-if="!link.showMetadata"
                                            class="text-[10px] px-1.5 py-0.5 rounded-full"
                                            style="background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border);">
                                            No Metadata
                                        </span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="font-medium mb-1" style="color: var(--text-1);">{{ link.targetName }}</div>
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                        :style="link.targetType === 'Group' ? 'background: var(--accent-light); color: var(--accent);' : 'background: var(--surface-3); color: var(--text-2);'">
                                        {{ link.targetType }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 capitalize" style="color: var(--text-2);">{{ link.type }}</td>
                                <td class="px-6 py-4 text-center" style="color: var(--text-2);">{{ link.views }}</td>
                                <td class="px-6 py-4 whitespace-nowrap" style="color: var(--text-2);">
                                    {{ formatDate(link.createdAt) }}
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <div class="flex items-center justify-end gap-1">
                                        <button @click="openEditModal(link)"
                                            class="p-1.5 rounded-lg transition" style="color: var(--accent);"
                                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-light)'"
                                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                            title="Edit Link">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button @click="copyLink(link.id, link.url)"
                                            class="p-1.5 rounded-lg transition"
                                            :style="copiedLinkId === link.id ? 'color: var(--success-text);' : 'color: var(--text-2);'"
                                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                            title="Copy Link">
                                            <svg v-if="copiedLinkId === link.id" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button @click="confirmDelete(link)"
                                            class="p-1.5 rounded-lg transition" style="color: var(--error);"
                                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                            title="Delete Link">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showEditModal = false">
            <div class="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-xl font-bold mb-6" style="color: var(--text-1);">Edit Share Link</h3>

                <div v-if="loadingEdit" class="flex justify-center py-8">
                    <div class="w-8 h-8 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>

                <form v-else @submit.prevent="handleUpdateLink" class="space-y-5">
                    <!-- General Settings -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-semibold pb-2" style="color: var(--text-2); border-bottom: 1px solid var(--separator);">General Settings</h4>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Link Label</label>
                            <input v-model="editForm.label" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="Public Link"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div class="flex items-center gap-2.5 p-3 rounded-xl"
                            style="background: var(--surface-2); border: 1px solid var(--separator);">
                            <input v-model="editForm.showMetadata" type="checkbox" id="editShowMetadata"
                                class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <label for="editShowMetadata" class="text-sm" style="color: var(--text-1);">Show photo metadata (date, camera, etc.)</label>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password Protection</label>
                            <input v-model="editForm.password" type="password"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="Set new password (leave empty to keep current)"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            <div v-if="editForm.hasPassword" class="flex items-center gap-2 mt-2">
                                <input v-model="editForm.removePassword" type="checkbox" id="removePass"
                                    class="w-4 h-4 rounded" style="accent-color: var(--error);" />
                                <label for="removePass" class="text-sm" style="color: var(--error);">Remove current password</label>
                            </div>
                        </div>
                    </div>

                    <!-- Group Content Settings -->
                    <div v-if="editForm.isGroup" class="space-y-4 pt-2">
                        <h4 class="text-sm font-semibold pb-2" style="color: var(--text-2); border-bottom: 1px solid var(--separator);">Group Content</h4>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Group Title</label>
                            <input v-model="editForm.groupTitle" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Description</label>
                            <textarea v-model="editForm.groupDescription" rows="2"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-2);">Tag Filters</label>
                            <p class="text-xs mb-2" style="color: var(--text-3);">Albums matching any of these tags are included live (in addition to explicitly selected albums below).</p>
                            <input v-model="editForm.groupTagsInput" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="wedding, portrait (comma-separated)"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <!-- Theme -->
                        <div>
                            <label class="block text-sm font-medium mb-2" style="color: var(--text-2);">Theme</label>
                            <div class="flex flex-wrap gap-2 items-center">
                                <button v-for="(theme, key) in ALBUM_THEMES" :key="key" type="button"
                                    @click="editForm.themePreset = key" :title="theme.label"
                                    class="w-7 h-7 rounded-full transition"
                                    :style="`background: linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd}); border: 2px solid ${editForm.themePreset === key ? 'var(--accent)' : 'transparent'}; outline: 2px solid ${editForm.themePreset === key ? 'var(--accent)' : 'transparent'};`" />
                                <button type="button" @click="editForm.themePreset = 'custom'" title="Custom"
                                    class="w-7 h-7 rounded-full text-xs font-bold transition"
                                    :style="editForm.themePreset === 'custom' ? 'background: var(--accent-light); color: var(--accent); border: 2px solid var(--accent);' : 'background: var(--surface-3); color: var(--text-2); border: 2px solid var(--separator);'">
                                    +
                                </button>
                                <button type="button" @click="editForm.themePreset = ''" title="Default (none)"
                                    class="px-2 h-7 rounded-full text-xs transition"
                                    :style="editForm.themePreset === '' ? 'background: var(--accent-light); color: var(--accent); border: 2px solid var(--accent);' : 'background: var(--surface-3); color: var(--text-2); border: 2px solid var(--separator);'">
                                    Default
                                </button>
                            </div>
                            <div v-if="editForm.themePreset === 'custom'" class="mt-3 grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">BG Start</label>
                                    <input type="color" v-model="editForm.customTheme.bgStart" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">BG End</label>
                                    <input type="color" v-model="editForm.customTheme.bgEnd" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">Accent Start</label>
                                    <input type="color" v-model="editForm.customTheme.btnStart" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">Accent End</label>
                                    <input type="color" v-model="editForm.customTheme.btnEnd" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Logo Text</label>
                            <input v-model="editForm.logoText" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="e.g. Wedding Collection 2025"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-2);">Albums in Group</label>
                            <p class="text-xs mb-2" style="color: var(--text-3);">Explicit selection. Tag-filtered albums are added on top of these.</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                <div v-for="album in availableAlbums" :key="album.id"
                                    class="flex items-center p-2.5 rounded-xl cursor-pointer transition"
                                    :style="editForm.groupAlbumIds.includes(album.id) ? 'background: var(--accent-light); border: 1px solid var(--accent);' : 'background: var(--surface-2); border: 1px solid var(--separator);'"
                                    @click="toggleAlbumInGroup(album.id)">
                                    <div class="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 mr-2.5"
                                        style="background: var(--surface-3);">
                                        <img v-if="album.coverPhoto" :src="buildAssetUrl(`/api/assets/thumb/${album.coverPhoto.id}`)"
                                            class="w-full h-full object-cover" />
                                        <div v-else class="w-full h-full flex items-center justify-center text-xs" style="color: var(--text-3);">📷</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium truncate" :style="editForm.groupAlbumIds.includes(album.id) ? 'color: var(--accent)' : 'color: var(--text-1)'">{{ album.name }}</div>
                                        <div class="text-xs" style="color: var(--text-3);">{{ album.photoCount }} photos</div>
                                    </div>
                                    <div class="w-5 h-5 rounded-full flex items-center justify-center ml-2 shrink-0"
                                        :style="editForm.groupAlbumIds.includes(album.id) ? 'background: var(--accent);' : 'background: transparent; border: 1.5px solid var(--separator);'">
                                        <svg v-if="editForm.groupAlbumIds.includes(album.id)" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="editError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ editError }}
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" @click="showEditModal = false"
                            class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                            Cancel
                        </button>
                        <button type="submit" :disabled="saving"
                            class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!saving && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ saving ? 'Saving…' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);">
            <div class="rounded-2xl p-6 max-w-sm w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-lg font-bold mb-2" style="color: var(--text-1);">Delete Share Link?</h3>
                <p class="text-sm mb-6" style="color: var(--text-2);">
                    Are you sure you want to delete this link? Anyone with the link will lose access.
                </p>
                <div class="flex gap-3">
                    <button @click="showDeleteModal = false"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Cancel
                    </button>
                    <button @click="handleDelete" :disabled="deleting"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--error); color: white;">
                        {{ deleting ? 'Deleting…' : 'Delete' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const dialog = useDialog()
import { buildAssetUrl } from '~/utils/auth-client'
import { ALBUM_THEMES } from '~/composables/useAlbumTheme'

interface ShareLink {
    id: string
    token: string
    type: string
    targetType: 'Group' | 'Album'
    targetName: string
    label: string | null
    views: number
    createdAt: number
    expiresAt: number | null
    hasPassword: boolean
    showMetadata: boolean
    url: string
}

interface AvailableAlbum {
    id: string
    name: string
    photoCount: number
    coverPhoto: { id: string; blurhash: string | null } | null
}

const loading = ref(true)
const error = ref('')
const links = ref<ShareLink[]>([])

const showDeleteModal = ref(false)
const linkToDelete = ref<ShareLink | null>(null)
const deleting = ref(false)
const copiedLinkId = ref<string | null>(null)

// Edit State
const showEditModal = ref(false)
const loadingEdit = ref(false)
const editingLink = ref<ShareLink | null>(null)
const editError = ref('')
const saving = ref(false)
const availableAlbums = ref<AvailableAlbum[]>([])

const editForm = reactive({
    id: '',
    label: '',
    password: '',
    hasPassword: false,
    removePassword: false,
    showMetadata: true,
    isGroup: false,
    groupTitle: '',
    groupDescription: '',
    groupAlbumIds: [] as string[],
    groupTags: [] as string[],
    groupTagsInput: '',
    themePreset: '',
    customTheme: { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' },
    logoText: '',
})

// Fetch Links
const fetchLinks = async () => {
    loading.value = true
    try {
        const response = await $fetch<{ success: boolean; data: ShareLink[] }>('/api/v1/share-links')
        links.value = response.data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to load share links'
    } finally {
        loading.value = false
    }
}

// Helpers
const getFullUrl = (path: string) => {
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Edit Logic
const openEditModal = async (link: ShareLink) => {
    editingLink.value = link
    showEditModal.value = true
    loadingEdit.value = true
    editError.value = ''

    // Reset Form
    editForm.id = link.id

    try {
        // Fetch Details
        const details = await $fetch<{ success: boolean; data: any }>(`/api/v1/share-links/${link.id}`)
        const data = details.data

        editForm.label = data.label || ''
        editForm.password = ''
        editForm.hasPassword = data.hasPassword
        editForm.removePassword = false
        editForm.showMetadata = data.showMetadata !== undefined ? data.showMetadata : true
        editForm.isGroup = data.isGroup

        if (data.isGroup) {
            editForm.groupTitle = data.groupTitle
            editForm.groupDescription = data.groupDescription || ''
            editForm.groupAlbumIds = data.groupAlbumIds
            editForm.groupTags = data.groupTags || []
            editForm.groupTagsInput = (data.groupTags || []).join(', ')
            editForm.themePreset = data.groupThemePreset || ''
            editForm.logoText = data.groupLogoText || ''
            if (data.groupCustomTheme) {
                try { Object.assign(editForm.customTheme, JSON.parse(data.groupCustomTheme)) } catch { /* keep defaults */ }
            }

            // Fetch Available Albums
            const albumsResponse = await $fetch<{ success: boolean; data: AvailableAlbum[] }>('/api/v1/albums/list')
            availableAlbums.value = albumsResponse.data
        }
    } catch (err: any) {
        editError.value = 'Failed to load details'
        console.error(err)
    } finally {
        loadingEdit.value = false
    }
}

const toggleAlbumInGroup = (albumId: string) => {
    const index = editForm.groupAlbumIds.indexOf(albumId)
    if (index === -1) {
        editForm.groupAlbumIds.push(albumId)
    } else {
        editForm.groupAlbumIds.splice(index, 1)
    }
}

const handleUpdateLink = async () => {
    saving.value = true
    editError.value = ''

    try {
        const groupTags = editForm.groupTagsInput
            .split(',').map((t: string) => t.trim()).filter(Boolean)
        const customTheme = editForm.themePreset === 'custom'
            ? JSON.stringify(editForm.customTheme)
            : undefined

        await $fetch(`/api/v1/share-links/${editForm.id}`, {
            method: 'PUT',
            body: {
                label: editForm.label,
                showMetadata: editForm.showMetadata,
                password: editForm.password || undefined,
                removePassword: editForm.removePassword,
                isGroup: editForm.isGroup,
                groupTitle: editForm.groupTitle,
                groupDescription: editForm.groupDescription,
                groupAlbumIds: editForm.groupAlbumIds,
                groupTags,
                themePreset: editForm.themePreset || null,
                customTheme,
                logoText: editForm.logoText || null,
            }
        })

        showEditModal.value = false
        await fetchLinks() // Refresh list
    } catch (err: any) {
        editError.value = err.data?.statusMessage || 'Failed to update link'
    } finally {
        saving.value = false
    }
}

const copyLink = async (id: string, path: string) => {
    const url = getFullUrl(path)
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url)
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement("textarea")
            textArea.value = url

            // Ensure element is not visible but part of DOM
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

        // Success feedback
        copiedLinkId.value = id
        setTimeout(() => {
            copiedLinkId.value = null
        }, 2000)

    } catch (err) {
        console.error('Failed to copy: ', err)
        dialog.toast('Failed to copy link manually: ' + url)
    }
}

// Delete Logic
const confirmDelete = (link: ShareLink) => {
    linkToDelete.value = link
    showDeleteModal.value = true
}

const handleDelete = async () => {
    if (!linkToDelete.value) return
    deleting.value = true

    try {
        await $fetch(`/api/v1/share-links/${linkToDelete.value.id}`, { method: 'DELETE' })
        // Remove from list locally
        links.value = links.value.filter(l => l.id !== linkToDelete.value?.id)
        showDeleteModal.value = false
        linkToDelete.value = null
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to delete link')
    } finally {
        deleting.value = false
    }
}

onMounted(() => {
    fetchLinks()
})
</script>
