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
                            {{ person.faces.length }} {{ person.faces.length === 1 ? 'face' : 'faces' }}
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

                <h2 class="text-base font-semibold mb-4" style="color: var(--text-1);">Faces</h2>
                <div v-if="person.faces.length === 0" class="text-center py-12 rounded-2xl"
                    style="background: var(--surface-1); border: 1px solid var(--separator);">
                    <p class="text-sm" style="color: var(--text-2);">No faces found for this person.</p>
                </div>
                <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    <button v-for="face in person.faces" :key="face.id"
                        class="aspect-square rounded-lg overflow-hidden relative group cursor-pointer"
                        :style="face.albumId ? 'background: var(--surface-3);' : 'cursor: default;'"
                        :aria-label="face.albumId ? `Open photo in album` : 'Face thumbnail'"
                        @click="openFacePhoto(face)">
                        <img v-if="!isThumbBroken(face.id)" :src="faceThumb(face.id)" :alt="displayName"
                            loading="lazy" decoding="async"
                            class="absolute inset-0 w-full h-full object-cover transition group-hover:scale-[1.04]"
                            @error="onThumbError(face.id)" />
                        <div v-else class="absolute inset-0 flex items-center justify-center">
                            <Icon name="lucide:user" class="w-6 h-6" style="color: var(--text-3);" :stroke-width="1.5" />
                        </div>
                        <div v-if="face.albumId"
                            class="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 flex items-end justify-end">
                            <Icon name="lucide:external-link" class="w-4 h-4 m-2 text-white opacity-0 group-hover:opacity-100 transition"
                                :stroke-width="2" />
                        </div>
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
    x1: number
    y1: number
    x2: number
    y2: number
}

interface Person {
    id: string
    name: string | null
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
const editing = ref(false)
const renameDraft = ref('')
const showMergeModal = ref(false)
const mergeSearch = ref('')
const mergePeople = ref<PersonSummary[]>([])
const mergePeopleLoading = ref(false)
const mergingTargetId = ref<string | null>(null)

const displayName = computed(() => person.value?.name?.trim() || 'Unnamed person')
const headerFaceId = computed(() => person.value?.faces[0]?.id || null)
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

const faceThumb = (id: string | null) => (id ? buildAssetUrl(`/api/v1/faces/${id}/thumb`) : '')
const displayNameOf = (target: PersonSummary) => target.name?.trim() || 'Unnamed person'
const countLabelOf = (target: PersonSummary) =>
    `${target.faceCount} ${target.faceCount === 1 ? 'face' : 'faces'}`

const isThumbBroken = (id: string | null) => !id || failedThumbs.value.has(id)

function onThumbError(id: string | null) {
    if (id) failedThumbs.value.add(id)
}

async function loadPerson() {
    loading.value = true
    fetchError.value = null
    try {
        const res = await $fetch<{ id: string; name: string | null; faces: Face[] }>(`/api/v1/people/${personId}`)
        person.value = {
            id: res.id,
            name: res.name,
            faces: Array.isArray(res.faces) ? res.faces : []
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

function openFacePhoto(face: Face) {
    if (!face.albumId) return
    navigateTo(`/album/${face.albumId}?photo=${face.photoId}`)
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
        const res = await $fetch<{ people: PersonSummary[] }>('/api/v1/people')
        mergePeople.value = (res?.people || []).filter(p => p.id !== personId)
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
