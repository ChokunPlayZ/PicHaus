<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="People" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex items-center justify-between mb-8 gap-4">
                <div class="min-w-0">
                    <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">People</h1>
                    <p class="text-sm mt-1" style="color: var(--text-2);">
                        {{ totalPeople }} {{ totalPeople === 1 ? 'person' : 'people' }} found in your library
                    </p>
                </div>
                <button @click="loadPeople" :disabled="loading"
                    class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition shrink-0 disabled:opacity-50"
                    style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);"
                    @mouseover="!loading && (($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)')"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'">
                    <Icon name="lucide:refresh-cw" class="w-4 h-4" :class="{ 'animate-spin': loading }" :stroke-width="2" />
                    {{ loading ? 'Refreshing…' : 'Refresh' }}
                </button>
                <button @click="openIdentifyPicker"
                    class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition shrink-0"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    <Icon name="lucide:scan-face" class="w-4 h-4" :stroke-width="2" />
                    Identify photo
                </button>
                <input ref="identifyInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
                    @change="onIdentifyFile" />
            </div>

            <!-- Identify results panel -->
            <div v-if="identifyPanelOpen" class="mb-8 rounded-2xl p-4 sm:p-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h2 class="text-lg font-semibold" style="color: var(--text-1);">Who's in this photo?</h2>
                    <button @click="closeIdentify" class="text-sm transition inline-flex items-center gap-1.5"
                        style="color: var(--text-3);"
                        @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'"
                        @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-3)'">
                        <Icon name="lucide:x" class="w-4 h-4" :stroke-width="2" />
                        Close
                    </button>
                </div>

                <div v-if="identifyLoading" class="flex items-center gap-2.5 py-6">
                    <div class="w-5 h-5 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                    <span class="text-sm" style="color: var(--text-2);">Identifying faces…</span>
                </div>

                <div v-else-if="identifyError" class="text-sm" style="color: var(--error-text);">{{ identifyError }}</div>

                <div v-else-if="identifyFaces.length === 0">
                    <p class="text-sm" style="color: var(--text-2);">No faces detected in that photo.</p>
                </div>

                <div v-else class="space-y-2">
                    <p class="text-sm font-medium" style="color: var(--text-2);">
                        {{ identifyFaces.length }} {{ identifyFaces.length === 1 ? 'face' : 'faces' }} found
                    </p>
                    <button v-for="face in identifyFaces" :key="face.index"
                        class="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/5"
                        :style="face.person ? '' : 'opacity: 0.75;'"
                        @click="face.person && navigateTo(`/people/${face.person.id}`)">
                        <div class="w-12 h-12 rounded-full overflow-hidden relative flex-shrink-0"
                            style="border: 1px solid var(--separator); background: var(--surface-3);">
                            <img v-if="identifyPreviewUrl" :src="identifyPreviewUrl" alt="" aria-hidden="true"
                                class="absolute" :style="identifyCropStyle(face.box)" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <template v-if="face.person">
                                <p class="font-semibold text-sm truncate" style="color: var(--text-1);">
                                    {{ face.person.name || 'Unnamed person' }}
                                    <span v-if="face.person.instagram" class="font-normal" style="color: var(--accent);">
                                        @{{ face.person.instagram }}
                                    </span>
                                </p>
                                <p class="text-xs mt-0.5" style="color: var(--text-3);">
                                    {{ Math.round((face.similarity || 0) * 100) }}% match
                                </p>
                            </template>
                            <template v-else>
                                <p class="font-semibold text-sm" style="color: var(--text-2);">Unidentified</p>
                                <p class="text-xs mt-0.5" style="color: var(--text-3);">No match above threshold</p>
                            </template>
                        </div>
                        <Icon v-if="face.person" name="lucide:chevron-right" class="w-4 h-4 shrink-0"
                            style="color: var(--text-3);" :stroke-width="2" />
                    </button>
                </div>
            </div>

            <template v-if="loading && people.length === 0">
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <div v-for="i in 10" :key="i" class="rounded-2xl p-0 overflow-hidden animate-pulse"
                        style="background: var(--surface-1); border: 1px solid var(--separator);">
                        <div class="aspect-square" style="background: var(--surface-3);"></div>
                        <div class="p-4 space-y-2">
                            <div class="h-4 rounded" style="background: var(--surface-3);"></div>
                            <div class="h-3 w-1/2 rounded" style="background: var(--surface-3);"></div>
                        </div>
                    </div>
                </div>
            </template>

            <div v-else-if="fetchError" class="rounded-2xl p-6 text-center"
                style="background: var(--error-bg); border: 1px solid var(--error-border);">
                <p class="text-sm" style="color: var(--error-text);">{{ fetchError }}</p>
                <button @click="loadPeople" class="mt-3 text-sm underline" style="color: var(--error);">Try again</button>
            </div>

            <div v-else-if="people.length === 0" class="text-center py-16 rounded-2xl"
                style="background: var(--surface-1); border: 1px solid var(--separator);">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style="background: var(--surface-3);">
                    <Icon name="lucide:users" class="w-7 h-7" style="color: var(--text-3);" :stroke-width="1.5" />
                </div>
                <h3 class="text-lg font-semibold mb-1" style="color: var(--text-1);">No people found</h3>
                <p class="text-sm" style="color: var(--text-2);">People appear after face detection has run on your photos.</p>
            </div>

            <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div v-for="person in people" :key="person.id"
                    class="rounded-2xl overflow-hidden transition hover:-translate-y-0.5"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <button class="block w-full aspect-square cursor-pointer group relative overflow-hidden"
                        style="background: var(--surface-3);" :aria-label="`View ${displayName(person)}`"
                        @click="navigateTo(`/people/${person.id}`)">
                        <img v-if="!isThumbBroken(person.representativeFaceId)" :src="faceThumb(person.representativeFaceId)"
                            :alt="displayName(person)" loading="lazy" decoding="async"
                            class="absolute inset-0 w-full h-full object-cover transition group-hover:scale-[1.03]"
                            @error="onThumbError(person.representativeFaceId)" />
                        <div v-else class="absolute inset-0 flex items-center justify-center">
                            <Icon name="lucide:user" class="w-10 h-10" style="color: var(--text-3);" :stroke-width="1.5" />
                        </div>
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                    </button>

                    <div class="p-4">
                        <template v-if="editingId === person.id">
                            <form @submit.prevent="saveRename(person)">
                                <input :data-rename-person="person.id" v-model="renameDraft" type="text" maxlength="120"
                                    :disabled="savingName === person.id"
                                    class="w-full px-2 py-1.5 text-sm font-medium rounded-lg transition"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    @click.stop @blur="saveRename(person)" @keydown.esc.stop="cancelRename(person)" />
                            </form>
                        </template>
                        <template v-else>
                            <button @click.stop="startRename(person)"
                                class="block w-full text-left text-sm font-semibold truncate cursor-text transition"
                                :title="displayName(person)" style="color: var(--text-1);"
                                @mouseover="($event.currentTarget as HTMLElement).style.color = 'var(--text-link)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.color = 'var(--text-1)'">
                                {{ displayName(person) }}
                            </button>
                        </template>
                        <p class="text-xs mt-1 flex items-center gap-1" style="color: var(--text-3);">
                            <Icon name="lucide:scan-face" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
                            <span class="truncate">{{ countLabel(person) }}</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Infinite Scroll Sentinel -->
            <div ref="sentinelRef" class="h-20 flex justify-center items-center mt-4">
                <div v-if="loadingMore" class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded-full border-2 animate-spin" style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                    <span class="text-xs" style="color: var(--text-3);">Loading more…</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'
import { buildAssetUrl } from '~/utils/auth-client'

definePageMeta({ middleware: 'auth' })

interface Person {
    id: string
    name: string | null
    faceCount: number
    representativeFaceId: string | null
}

const { toast } = useDialog()

const people = ref<Person[]>([])
const totalPeople = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const page = ref(1)
const PAGE_SIZE = 50
const fetchError = ref<string | null>(null)
const failedThumbs = ref(new Set<string>())
const editingId = ref<string | null>(null)
const renameDraft = ref('')
const savingName = ref<string | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

// Identify-photo tool state
interface IdentifyFace {
    index: number
    box: { x1: number; y1: number; x2: number; y2: number }
    score: number | null
    person: {
        id: string
        name: string | null
        instagram: string | null
        representativeFaceId: string | null
        representativeFaceUrl: string | null
    } | null
    similarity: number | null
}
const identifyPanelOpen = ref(false)
const identifyLoading = ref(false)
const identifyError = ref<string | null>(null)
const identifyFaces = ref<IdentifyFace[]>([])
const identifyInput = ref<HTMLInputElement | null>(null)
const identifyPreviewUrl = ref<string | null>(null)
const identifyPreviewDims = ref<{ width: number; height: number } | null>(null)

const openIdentifyPicker = () => {
    identifyPanelOpen.value = true
    identifyError.value = null
    nextTick(() => identifyInput.value?.click())
}

const closeIdentify = () => {
    identifyPanelOpen.value = false
    if (identifyPreviewUrl.value) URL.revokeObjectURL(identifyPreviewUrl.value)
    identifyPreviewUrl.value = null
    identifyPreviewDims.value = null
    identifyFaces.value = []
    identifyError.value = null
    if (identifyInput.value) identifyInput.value.value = ''
}

const onIdentifyFile = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (identifyPreviewUrl.value) URL.revokeObjectURL(identifyPreviewUrl.value)
    identifyPreviewUrl.value = URL.createObjectURL(file)
    const probe = new Image()
    probe.onload = () => {
        if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
            identifyPreviewDims.value = { width: probe.naturalWidth, height: probe.naturalHeight }
        }
    }
    probe.src = identifyPreviewUrl.value

    identifyLoading.value = true
    identifyError.value = null
    identifyFaces.value = []
    try {
        const form = new FormData()
        form.append('image', file)
        const res = await $fetch<{ success: boolean; data: { faces: IdentifyFace[] } }>('/api/v1/people/identify', {
            method: 'POST',
            body: form,
        })
        identifyFaces.value = Array.isArray(res.data?.faces) ? res.data.faces : []
    } catch (err: any) {
        identifyError.value = err?.data?.statusMessage ?? 'Failed to identify faces'
    } finally {
        identifyLoading.value = false
        if (identifyInput.value) identifyInput.value.value = ''
    }
}

// Same face-crop math as the face-search circles: square pixel-space window,
// aspect-preserved img, clamped inside the photo, centered on the face.
const identifyCropStyle = (box: { x1: number; y1: number; x2: number; y2: number }) => {
    const C = 48
    const dims = identifyPreviewDims.value
    const W = dims?.width || 1
    const H = dims?.height || 1
    const faceWPx = (box.x2 - box.x1) * W
    const faceHPx = (box.y2 - box.y1) * H
    const windowSidePx = Math.max(faceWPx, faceHPx) * 1.4
    const scale = Math.max(C / windowSidePx, C / Math.min(W, H))
    const winCx = Math.min(Math.max((box.x1 + box.x2) / 2 * W, windowSidePx / 2), Math.max(W - windowSidePx / 2, windowSidePx / 2))
    const winCy = Math.min(Math.max((box.y1 + box.y2) / 2 * H, windowSidePx / 2), Math.max(H - windowSidePx / 2, windowSidePx / 2))
    return {
        width: `${W * scale / C * 100}%`,
        height: `${H * scale / C * 100}%`,
        left: `${50 - winCx * scale / C * 100}%`,
        top: `${50 - winCy * scale / C * 100}%`,
    }
}

const faceThumb = (id: string | null) => (id ? buildAssetUrl(`/api/v1/faces/${id}/thumb`) : '')
const displayName = (person: Person) => person.name?.trim() || 'Unnamed person'
const countLabel = (person: Person) => `${person.faceCount} ${person.faceCount === 1 ? 'face' : 'faces'}`

const isThumbBroken = (id: string | null) => !id || failedThumbs.value.has(id)

function onThumbError(id: string | null) {
    if (id) failedThumbs.value.add(id)
}

async function loadPeople() {
    loading.value = true
    fetchError.value = null
    page.value = 1
    try {
        const res = await $fetch<{ success: boolean; data: Person[]; pagination?: { total: number; hasMore: boolean } }>('/api/v1/people', {
            params: { page: 1, limit: PAGE_SIZE }
        })
        people.value = Array.isArray(res?.data) ? res.data : []
        totalPeople.value = res?.pagination?.total ?? people.value.length
        hasMore.value = res?.pagination?.hasMore ?? false
    } catch (err: any) {
        fetchError.value = err?.data?.statusMessage ?? 'Failed to load people'
    } finally {
        loading.value = false
        fillViewportIfNeeded()
    }
}

async function loadMorePeople() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
        const res = await $fetch<{ success: boolean; data: Person[]; pagination?: { total: number; hasMore: boolean } }>('/api/v1/people', {
            params: { page: page.value + 1, limit: PAGE_SIZE }
        })
        const next = Array.isArray(res?.data) ? res.data : []
        const seen = new Set(people.value.map(p => p.id))
        for (const person of next) {
            if (!seen.has(person.id)) {
                seen.add(person.id)
                people.value.push(person)
            }
        }
        if (next.length > 0) page.value += 1
        hasMore.value = res?.pagination?.hasMore ?? false
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to load more people', 'error')
    } finally {
        loadingMore.value = false
        fillViewportIfNeeded()
    }
}

// Large screens: if the first page(s) don't fill the viewport, the sentinel is
// already visible and IntersectionObserver fires once (before hasMore is set)
// and never again — check manually after every load.
let fillViewportTimer: ReturnType<typeof setTimeout> | null = null
function fillViewportIfNeeded() {
    if (fillViewportTimer) clearTimeout(fillViewportTimer)
    fillViewportTimer = setTimeout(() => {
        const el = sentinelRef.value
        if (!el || loading.value || loadingMore.value || !hasMore.value) return
        const rect = el.getBoundingClientRect()
        const inView = rect.top <= window.innerHeight && rect.bottom >= 0
        if (inView) loadMorePeople()
    }, 150)
}

let peopleObserver: IntersectionObserver | null = null
onMounted(() => {
    loadPeople()
    peopleObserver = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasMore.value && !loading.value && !loadingMore.value) {
            loadMorePeople()
        }
    }, { rootMargin: '300px' })
    if (sentinelRef.value) peopleObserver.observe(sentinelRef.value)
})

watch(sentinelRef, (el) => {
    if (!peopleObserver) return
    if (el) {
        peopleObserver.observe(el)
    }
})

onUnmounted(() => {
    peopleObserver?.disconnect()
    if (fillViewportTimer) clearTimeout(fillViewportTimer)
})

function startRename(person: Person) {
    editingId.value = person.id
    renameDraft.value = person.name || ''
    nextTick(() => {
        const input = document.querySelector<HTMLInputElement>(`[data-rename-person="${person.id}"]`)
        input?.focus()
        input?.select()
    })
}

function cancelRename(person: Person) {
    if (editingId.value !== person.id) return
    editingId.value = null
    renameDraft.value = ''
}

async function saveRename(person: Person) {
    if (editingId.value !== person.id) return
    const name = renameDraft.value.trim()
    editingId.value = null
    if (name === (person.name || '')) return

    savingName.value = person.id
    try {
        await $fetch(`/api/v1/people/${person.id}`, {
            method: 'PATCH',
            body: { name: name || null }
        })
        person.name = name || null
        toast('Name updated', 'success')
    } catch (err: any) {
        toast(err?.data?.statusMessage || 'Failed to update name', 'error')
    } finally {
        savingName.value = null
    }
}
</script>
