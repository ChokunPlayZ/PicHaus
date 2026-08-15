<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to People" back-to="/people" :title="displayName" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div v-if="loading && !person" class="flex flex-col items-center gap-3 py-16">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                <p class="text-sm" style="color: var(--text-3);">Loading person…</p>
            </div>

            <div v-else-if="fetchError" class="rounded-2xl p-6 text-center"
                style="background: var(--error-bg); border: 1px solid var(--error-border);">
                <p class="text-sm" style="color: var(--error-text);">{{ fetchError }}</p>
                <button @click="loadPerson" class="mt-3 text-sm underline" style="color: var(--error);">Try again</button>
            </div>

            <template v-else-if="person">
                <div class="rounded-2xl p-6 mb-8 flex flex-col sm:flex-row gap-6 sm:items-center"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <div class="w-28 h-28 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center"
                        style="background: var(--surface-3);">
                        <img v-if="!isThumbBroken(headerFaceId)" :src="faceThumb(headerFaceId)" :alt="displayName"
                            class="w-full h-full object-cover" @error="onThumbError(headerFaceId)" />
                        <Icon v-else name="lucide:user" class="w-12 h-12" style="color: var(--text-3);" :stroke-width="1.5" />
                    </div>

                    <div class="flex-1 min-w-0">
                        <template v-if="editing">
                            <form @submit.prevent="saveRename">
                                <input data-person-rename v-model="renameDraft" type="text" maxlength="120"
                                    class="w-full max-w-md px-3 py-2 text-2xl font-bold tracking-tight rounded-xl transition"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    @blur="saveRename" @keydown.esc.stop="editing = false" />
                            </form>
                        </template>
                        <template v-else>
                            <button @click="startRename"
                                class="text-left text-3xl font-bold tracking-tight cursor-text break-words"
                                style="color: var(--text-1);"
                                @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-link)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'">
                                {{ displayName }}
                            </button>
                        </template>
                        <p class="text-sm mt-2 flex items-center gap-1.5" style="color: var(--text-3);">
                            <Icon name="lucide:scan-face" class="w-4 h-4" :stroke-width="2" />
                            {{ photosLabel }}
                        </p>
                        <div class="mt-2">
                            <form v-if="editingInstagram" @submit.prevent="saveInstagram">
                                <div class="inline-flex items-center gap-1 rounded-lg px-2 py-1"
                                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                                    <Icon name="lucide:instagram" class="w-4 h-4 shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                                    <span class="text-sm" style="color: var(--text-3);">@</span>
                                    <input data-person-instagram v-model="instagramDraft" type="text" maxlength="30"
                                        placeholder="handle"
                                        class="w-36 text-sm rounded transition"
                                        style="background: transparent; border: none; color: var(--text-1); outline: none;"
                                        @blur="saveInstagram" @keydown.esc.stop="editingInstagram = false" />
                                </div>
                            </form>
                            <template v-else>
                                <div class="inline-flex items-center gap-1.5">
                                    <a v-if="person.instagram" :href="`https://instagram.com/${person.instagram}`" target="_blank" rel="noopener noreferrer"
                                        class="inline-flex items-center gap-1.5 text-sm transition"
                                        style="color: var(--text-link); text-decoration: none;"
                                        @mouseover="($event.currentTarget as HTMLElement).style.textDecoration = 'underline'"
                                        @mouseout="($event.currentTarget as HTMLElement).style.textDecoration = 'none'"
                                        @click.stop>
                                        <Icon name="lucide:instagram" class="w-4 h-4" :stroke-width="2" />
                                        @{{ person.instagram }}
                                    </a>
                                    <button v-if="person.instagram" @click="startEditInstagram"
                                        :aria-label="`Edit Instagram handle`" title="Edit Instagram handle"
                                        class="p-1 rounded-md transition"
                                        style="color: var(--text-3); background: transparent; border: none; cursor: pointer;"
                                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-link)'; ($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'; ($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                        <Icon name="lucide:pencil" class="w-3.5 h-3.5" :stroke-width="2" />
                                    </button>
                                    <button v-else @click="startEditInstagram"
                                        class="inline-flex items-center gap-1.5 text-sm transition"
                                        style="color: var(--text-3); background: transparent; border: none; cursor: pointer; padding: 0;"
                                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-link)'"
                                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                                        <Icon name="lucide:instagram" class="w-4 h-4" :stroke-width="2" />
                                        <span>Add Instagram</span>
                                    </button>
                                </div>
                            </template>
                        </div>
                    </div>

                    <button v-if="isAdmin" @click="openMergeModal" :disabled="mergingTargetId !== null"
                        class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition shrink-0 disabled:opacity-50"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                        @mouseover="mergingTargetId === null && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <Icon name="lucide:arrow-left-right" class="w-4 h-4" :stroke-width="2" />
                        {{ mergingTargetId !== null ? 'Merging…' : 'Merge into…' }}
                    </button>
                </div>

                <h2 class="text-base font-semibold mb-4" style="color: var(--text-1);">Photos</h2>
                <div v-if="personPhotos.length === 0" class="text-center py-12 rounded-2xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <p class="text-sm" style="color: var(--text-2);">No photos found for this person.</p>
                </div>
                <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <button v-for="photo in personPhotos" :key="photo.photoId"
                        class="aspect-square rounded-xl overflow-hidden relative group cursor-pointer"
                        style="background: var(--surface-3);"
                        :aria-label="`Open photo in album`"
                        @click="openPersonPhoto(photo)">
                        <img v-if="!isPhotoBroken(photo.photoId)" :src="photo.thumbUrl" :alt="displayName"
                            loading="lazy" decoding="async"
                            class="absolute inset-0 w-full h-full object-cover transition group-hover:scale-[1.03]"
                            @error="onPhotoError(photo.photoId)" />
                        <div v-else class="absolute inset-0 flex items-center justify-center">
                            <Icon name="lucide:image" class="w-8 h-8" style="color: var(--text-3);" :stroke-width="1.5" />
                        </div>
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300"></div>
                        <span
                            class="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-md"
                            style="background: rgba(0,0,0,0.55); color: #fff;"
                            :title="`${photo.faceCount} ${photo.faceCount === 1 ? 'face' : 'faces'} in this photo`">
                            <Icon name="lucide:scan-face" class="w-3 h-3 inline-block -mt-0.5 mr-1" :stroke-width="2" />
                            {{ photo.faceCount }}
                        </span>
                    </button>
                </div>
            </template>
        </div>

        <!-- Merge into another person (admin) -->
        <div v-if="showMergeModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showMergeModal = false">
            <div class="rounded-2xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <div class="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h3 class="text-xl font-bold" style="color: var(--text-1);">Merge People</h3>
                        <p class="text-sm mt-1" style="color: var(--text-3);">
                            Move faces from "{{ displayName }}" into another person, then remove this person.
                        </p>
                    </div>
                    <button @click="showMergeModal = false" class="p-1.5 rounded-lg shrink-0 transition"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <Icon name="lucide:x" class="w-5 h-5" :stroke-width="2" />
                    </button>
                </div>

                <div class="relative mb-3">
                    <input v-model="mergeSearch" type="text" placeholder="Search people…"
                        class="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl transition"
                        style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                        @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'"
                        @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'" />
                    <Icon name="lucide:search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                        style="color: var(--text-3);" :stroke-width="2" />
                </div>

                <div class="flex-1 overflow-y-auto space-y-2 min-h-0">
                    <p v-if="mergePeopleLoading" class="text-sm text-center py-8" style="color: var(--text-3);">Loading people…</p>
                    <p v-else-if="filteredMergePeople.length === 0" class="text-sm text-center py-8"
                        style="color: var(--text-3);">No other people found.</p>
                    <button v-for="target in filteredMergePeople" :key="target.id" @click="mergeInto(target)"
                        :disabled="mergingTargetId === target.id"
                        class="w-full flex items-center gap-3 p-3 rounded-xl text-left transition disabled:opacity-50"
                        style="background: var(--surface-2); border: 1px solid var(--separator);"
                        @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                        <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                            style="background: var(--surface-3);">
                            <img v-if="!isThumbBroken(target.representativeFaceId)" :src="faceThumb(target.representativeFaceId)"
                                alt="" class="w-full h-full object-cover" @error="onThumbError(target.representativeFaceId)" />
                            <Icon v-else name="lucide:user" class="w-5 h-5" style="color: var(--text-3);" :stroke-width="1.5" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate" style="color: var(--text-1);">{{ displayNameOf(target) }}</p>
                            <p class="text-xs mt-0.5" style="color: var(--text-3);">{{ countLabelOf(target) }}</p>
                        </div>
                        <Icon v-if="mergingTargetId === target.id" name="lucide:loader-2"
                            class="w-4 h-4 animate-spin shrink-0" style="color: var(--accent);" :stroke-width="2" />
                        <Icon v-else name="lucide:arrow-right" class="w-4 h-4 shrink-0" style="color: var(--text-3);" :stroke-width="2" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'

definePageMeta({ middleware: 'auth' })

interface Face {
    id: string
    photoId: string
    albumId: string | null
    photoUpdatedAt: number
    photoCreatedAt: number
    x1: number
    y1: number
    x2: number
    y2: number
}

interface PersonPhoto {
    photoId: string
    albumId: string | null
    faceCount: number
    thumbUrl: string
}

interface Person {
    id: string
    name: string | null
    instagram: string | null
    faces: Face[]
}

interface PersonSummary {
    id: string
    name: string | null
    faceCount: number
    representativeFaceId: string | null
}

const route = useRoute()
const personId = route.params.id as string
const currentUser = useState<any>('currentUser')
const { confirm, toast } = useDialog()

const person = ref<Person | null>(null)
const loading = ref(true)
const fetchError = ref<string | null>(null)
const failedThumbs = ref(new Set<string>())
const failedPhotos = ref(new Set<string>())
const editing = ref(false)
const renameDraft = ref('')
const editingInstagram = ref(false)
const instagramDraft = ref('')
const showMergeModal = ref(false)
const mergeSearch = ref('')
const mergePeople = ref<PersonSummary[]>([])
const mergePeopleLoading = ref(false)
const mergingTargetId = ref<string | null>(null)

const displayName = computed(() => person.value?.name?.trim() || 'Unnamed person')
const headerFaceId = computed(() => person.value?.faces[0]?.id || null)
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

const faceThumb = (id: string | null) => (id ? buildAssetUrl(`/api/v1/faces/${id}/thumb`) : '')
const photosLabel = computed(() => {
    if (!person.value) return ''
    const photoCount = personPhotos.value.length
    const faceCount = person.value.faces.length
    const parts = [`${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`]
    parts.push(`${faceCount} ${faceCount === 1 ? 'face' : 'faces'}`)
    return parts.join(' · ')
})
const personPhotos = computed<PersonPhoto[]>(() => {
    const byPhoto = new Map<string, PersonPhoto>()
    for (const face of person.value?.faces || []) {
        const existing = byPhoto.get(face.photoId)
        if (existing) {
            existing.faceCount++
        } else {
            byPhoto.set(face.photoId, {
                photoId: face.photoId,
                albumId: face.albumId,
                faceCount: 1,
                thumbUrl: buildAssetUrl(`/api/assets/thumb/${face.photoId}?t=${face.photoUpdatedAt || face.photoCreatedAt || ''}`),
            })
        }
    }
    return [...byPhoto.values()]
})
const displayNameOf = (target: PersonSummary) => target.name?.trim() || 'Unnamed person'
const countLabelOf = (target: PersonSummary) =>
    `${target.faceCount} ${target.faceCount === 1 ? 'face' : 'faces'}`

const isThumbBroken = (id: string | null) => !id || failedThumbs.value.has(id)

function onThumbError(id: string | null) {
    if (id) failedThumbs.value.add(id)
}

const isPhotoBroken = (id: string | null) => !id || failedPhotos.value.has(id)

function onPhotoError(id: string | null) {
    if (id) failedPhotos.value.add(id)
}

async function loadPerson() {
    loading.value = true
    fetchError.value = null
    try {
        const res = await $fetch<{
            success: boolean
            data: { person: { id: string; name: string | null; instagram: string | null }; faces: Face[] }
        }>(`/api/v1/people/${personId}`)
        person.value = {
            id: res.data.person.id,
            name: res.data.person.name,
            instagram: res.data.person.instagram ?? null,
            faces: Array.isArray(res.data.faces) ? res.data.faces : []
        }
    } catch (err: any) {
        fetchError.value = err?.data?.statusMessage ?? 'Failed to load person'
    } finally {
        loading.value = false
    }
}

function startRename() {
    editing.value = true
    renameDraft.value = person.value?.name || ''
    nextTick(() => {
        document.querySelector<HTMLInputElement>('[data-person-rename]')?.focus()
    })
}

async function saveRename() {
    if (!editing.value || !person.value) return
    const name = renameDraft.value.trim()
    editing.value = false
    if (name === (person.value.name || '')) return
    try {
        await $fetch(`/api/v1/people/${personId}`, {
            method: 'PATCH',
            body: { name: name || null }
        })
        person.value.name = name || null
        toast('Name updated', 'success')
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to update name', 'error')
    }
}

function startEditInstagram() {
    editingInstagram.value = true
    instagramDraft.value = person.value?.instagram || ''
    nextTick(() => {
        document.querySelector<HTMLInputElement>('[data-person-instagram]')?.focus()
    })
}

async function saveInstagram() {
    if (!editingInstagram.value || !person.value) return
    const handle = instagramDraft.value.trim().replace(/^@/, '')
    editingInstagram.value = false
    if (handle === (person.value.instagram || '')) return
    try {
        await $fetch(`/api/v1/people/${personId}`, {
            method: 'PATCH',
            body: { instagram: handle || null }
        })
        person.value.instagram = handle || null
        toast('Instagram updated', 'success')
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to update Instagram', 'error')
        editingInstagram.value = true
        nextTick(() => {
            document.querySelector<HTMLInputElement>('[data-person-instagram]')?.focus()
        })
    }
}

function openPersonPhoto(photo: PersonPhoto) {
    if (!photo.albumId) return
    navigateTo(`/album/${photo.albumId}?photo=${photo.photoId}`)
}

const filteredMergePeople = computed(() => {
    const query = mergeSearch.value.trim().toLowerCase()
    if (!query) return mergePeople.value
    return mergePeople.value.filter(p => displayNameOf(p).toLowerCase().includes(query))
})

async function openMergeModal() {
    showMergeModal.value = true
    mergeSearch.value = ''
    mergePeopleLoading.value = true
    try {
        const res = await $fetch<{ success: boolean; data: PersonSummary[] }>('/api/v1/people', {
            params: { page: 1, limit: 200 }
        })
        mergePeople.value = (res?.data || []).filter(p => p.id !== personId)
    } catch (err: any) {
        mergePeople.value = []
        toast(err?.data?.statusMessage || 'Failed to load people', 'error')
        showMergeModal.value = false
    } finally {
        mergePeopleLoading.value = false
    }
}

async function mergeInto(target: PersonSummary) {
    if (!person.value) return
    const ok = await confirm(
        `Move all faces from "${displayName.value}" into "${displayNameOf(target)}"? This cannot be undone.`,
        { title: 'Merge People', danger: true }
    )
    if (!ok) return

    mergingTargetId.value = target.id
    try {
        await $fetch(`/api/v1/admin/people/${target.id}/merge`, {
            method: 'POST',
            body: { sourcePersonId: person.value.id }
        })
        toast('People merged', 'success')
        showMergeModal.value = false
        await navigateTo(`/people/${target.id}`)
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to merge people', 'error')
    } finally {
        mergingTargetId.value = null
    }
}

onMounted(async () => {
    if (!currentUser.value) {
        try {
            const res = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
            currentUser.value = res.data
        } catch {
            currentUser.value = null
        }
    }
    await loadPerson()
})
</script>
