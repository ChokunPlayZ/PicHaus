<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar :show-back="true" back-text="Back to People" back-to="/people" :title="displayName" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div v-if="loading && !person" class="flex flex-col items-center gap-3 py-16">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                <p class="text-sm" style="color: var(--text-3);">Loading person…</p>
            </div>

            <div v-else-if="fetchError && !person" class="rounded-2xl p-6 text-center"
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
                            {{ total }} {{ total === 1 ? 'face' : 'faces' }}
                        </p>
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
                <div v-if="faces.length === 0" class="text-center py-12 rounded-2xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <p class="text-sm" style="color: var(--text-2);">No photos found for this person.</p>
                </div>
                <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    <button v-for="(face, index) in faces" :key="face.id"
                        class="aspect-square rounded-lg overflow-hidden relative group cursor-pointer"
                        style="background: var(--surface-3);"
                        aria-label="Open photo"
                        @click="openPhotoViewer(index)">
                        <img v-if="!failedPhotoThumbs.has(face.photoId)" :src="photoThumb(face.photoId)" :alt="`Photo of ${displayName}`"
                            loading="lazy" decoding="async"
                            class="absolute inset-0 w-full h-full object-contain"
                            @error="failedPhotoThumbs.add(face.photoId)" />
                        <div v-else class="absolute inset-0 flex items-center justify-center">
                            <Icon name="lucide:image" class="w-6 h-6" style="color: var(--text-3);" :stroke-width="1.5" />
                        </div>
                        <div
                            class="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 flex items-end justify-end">
                            <Icon name="lucide:expand" class="w-4 h-4 m-2 text-white opacity-0 group-hover:opacity-100 transition"
                                :stroke-width="2" />
                        </div>
                    </button>
                </div>
                <InfiniteScrollTrigger :loading="loading" :has-more="hasMore" :error="fetchError" @load="loadMore" />
            </template>
        </div>

        <PhotoViewer v-if="selectedFace" :photo="selectedFace.photo" :album-id="selectedFace.albumId"
            :has-previous="selectedPhotoIndex! > 0" :has-next="selectedPhotoIndex! < faces.length - 1 || hasMore"
            :previous-photo-id="previousPhoto?.id" :next-photo-id="nextPhoto?.id"
            :previous-photo-timestamp="previousPhoto?.updatedAt || previousPhoto?.createdAt"
            :next-photo-timestamp="nextPhoto?.updatedAt || nextPhoto?.createdAt"
            @close="closePhotoViewer" @previous="showPreviousPhoto" @next="showNextPhoto" />

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
                    <p v-if="!mergePeopleLoading && !mergePeopleError && filteredMergePeople.length === 0" class="text-sm text-center py-8"
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
                    <InfiniteScrollTrigger :loading="mergePeopleLoading" :has-more="mergeHasMore" :error="mergePeopleError"
                        @load="loadMoreMergePeople" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { buildAssetUrl } from '~/utils/auth-client'
import type { PeopleResponse, PersonResponse, PersonSummary, PersonFace as Face } from '~/types/people'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const personId = route.params.id as string
const currentUser = useState<any>('currentUser')
const { confirm, toast } = useDialog()

const person = ref<PersonSummary | null>(null)
const { items: faces, loading, error: fetchError, total, hasMore, refresh: loadPerson, loadMore } = usePaginatedList<Face>(
    async (page, signal) => {
        const res = await $fetch<PersonResponse>(`/api/v1/people/${personId}`, { query: { page, limit: 50 }, signal })
        if (!signal.aborted) person.value = res.data.person
        return { items: res.data.faces, pagination: res.pagination }
    },
    'Failed to load person',
)
const failedThumbs = ref(new Set<string>())
const failedPhotoThumbs = ref(new Set<string>())
const selectedPhotoIndex = ref<number | null>(null)
const pendingNextPhotoIndex = ref<number | null>(null)
const selectedFace = computed(() => selectedPhotoIndex.value === null ? null : faces.value[selectedPhotoIndex.value])
const previousPhoto = computed(() => selectedPhotoIndex.value === null ? null : faces.value[selectedPhotoIndex.value - 1]?.photo)
const nextPhoto = computed(() => selectedPhotoIndex.value === null ? null : faces.value[selectedPhotoIndex.value + 1]?.photo)
const editing = ref(false)
const renameDraft = ref('')
const showMergeModal = ref(false)
const mergeSearch = ref('')
const {
    items: mergePeople, loading: mergePeopleLoading, error: mergePeopleError,
    hasMore: mergeHasMore, refresh: loadMergePeople, loadMore: loadMoreMergePeople,
} = usePaginatedList<PersonSummary>(
    async (page, signal) => {
        const res = await $fetch<PeopleResponse>('/api/v1/people', {
            query: { page, limit: 50, search: mergeSearch.value.trim() }, signal,
        })
        return { items: res.data, pagination: res.pagination }
    },
    'Failed to load people',
)
const mergingTargetId = ref<string | null>(null)

const displayName = computed(() => person.value?.name?.trim() || 'Unnamed person')
const headerFaceId = computed(() => person.value?.representativeFaceId || faces.value[0]?.id || null)
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

const faceThumb = (id: string | null) => (id ? buildAssetUrl(`/api/v1/faces/${id}/thumb`) : '')
const photoThumb = (id: string) => buildAssetUrl(`/api/assets/thumb/${id}`)
const displayNameOf = (target: PersonSummary) => target.name?.trim() || 'Unnamed person'
const countLabelOf = (target: PersonSummary) =>
    `${target.faceCount} ${target.faceCount === 1 ? 'face' : 'faces'}`

const isThumbBroken = (id: string | null) => !id || failedThumbs.value.has(id)

function onThumbError(id: string | null) {
    if (id) failedThumbs.value.add(id)
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
            body: { name }
        })
        person.value.name = name || null
        toast('Name updated', 'success')
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to update name', 'error')
    }
}

function openPhotoViewer(index: number) {
    pendingNextPhotoIndex.value = null
    selectedPhotoIndex.value = index
}

function closePhotoViewer() {
    pendingNextPhotoIndex.value = null
    selectedPhotoIndex.value = null
}

function showPreviousPhoto() {
    pendingNextPhotoIndex.value = null
    if (selectedPhotoIndex.value !== null && selectedPhotoIndex.value > 0) selectedPhotoIndex.value--
}

function showNextPhoto() {
    const index = selectedPhotoIndex.value
    if (index === null) return
    if (index < faces.value.length - 1) {
        pendingNextPhotoIndex.value = null
        selectedPhotoIndex.value = index + 1
    } else if (hasMore.value) {
        pendingNextPhotoIndex.value = index
        if (!loading.value) loadMore()
    }
}

// A next-photo request also waits for any page already loading behind the viewer.
watch([loading, () => faces.value.length], () => {
    const index = pendingNextPhotoIndex.value
    if (index === null || loading.value) return
    pendingNextPhotoIndex.value = null
    if (selectedPhotoIndex.value !== index) return
    if (index < faces.value.length - 1) selectedPhotoIndex.value = index + 1
    else if (fetchError.value) toast(fetchError.value, 'error')
})

const filteredMergePeople = computed(() => mergePeople.value.filter(p => p.id !== personId))

let mergeSearchTimeout: ReturnType<typeof setTimeout> | undefined
watch(mergeSearch, () => {
    clearTimeout(mergeSearchTimeout)
    if (showMergeModal.value) mergeSearchTimeout = setTimeout(loadMergePeople, 250)
}, { flush: 'sync' })
onUnmounted(() => clearTimeout(mergeSearchTimeout))

async function openMergeModal() {
    mergeSearch.value = ''
    showMergeModal.value = true
    await loadMergePeople()
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

onMounted(() => {
    loadPerson()
    if (!currentUser.value) {
        $fetch<{ success: boolean; data: any }>('/api/v1/auth/me').then(res => {
            currentUser.value = res.data
        }).catch(() => {
            currentUser.value = null
        })
    }
})
</script>
