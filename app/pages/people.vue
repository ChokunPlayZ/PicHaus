<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="People" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex items-center justify-between mb-8 gap-4">
                <div class="min-w-0">
                    <h1 class="text-3xl font-bold tracking-tight" style="color: var(--text-1);">People</h1>
                    <p class="text-sm mt-1" style="color: var(--text-2);">
                        {{ people.length }} {{ people.length === 1 ? 'person' : 'people' }} found in your library
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
        </div>
    </div>
</template>

<script setup lang="ts">
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
const loading = ref(true)
const fetchError = ref<string | null>(null)
const failedThumbs = ref(new Set<string>())
const editingId = ref<string | null>(null)
const renameDraft = ref('')
const savingName = ref<string | null>(null)

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
    try {
        const res = await $fetch<{ people: Person[] }>('/api/v1/people')
        people.value = Array.isArray(res?.people) ? res.people : []
    } catch (err: any) {
        fetchError.value = err?.data?.statusMessage ?? 'Failed to load people'
    } finally {
        loading.value = false
    }
}

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

onMounted(loadPeople)
</script>
