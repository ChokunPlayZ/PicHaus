<template>
    <Teleport to="body">
        <Transition name="ctx-menu">
            <div
                v-if="visible"
                ref="menuEl"
                class="photo-ctx-menu"
                :style="menuStyle"
                @click.stop
            >
                <!-- Photo info header -->
                <div class="ctx-header">
                    <p class="ctx-photo-name">{{ photo?.originalName || 'Photo' }}</p>
                    <p v-if="photo?.dateTaken || photo?.createdAt" class="ctx-photo-date">
                        {{ formatDate(photo?.dateTaken || photo?.createdAt) }}
                    </p>
                </div>
                <div class="ctx-divider" />

                <!-- Actions -->
                <button class="ctx-item" @click="emit('view')">
                    <Icon name="lucide:maximize-2" class="ctx-icon" :stroke-width="1.75" />
                    <span>Open</span>
                </button>

                <button class="ctx-item" @click="emit('download')">
                    <Icon name="lucide:download" class="ctx-icon" :stroke-width="1.75" />
                    <span>Download</span>
                </button>

                <button class="ctx-item" @click="emit('share')">
                    <Icon name="lucide:share-2" class="ctx-icon" :stroke-width="1.75" />
                    <span>Share Album Link</span>
                </button>

                <div class="ctx-divider" />

                <button v-if="photo?.albumId" class="ctx-item" @click="emit('go-to-album')">
                    <Icon name="lucide:folder-open" class="ctx-icon" :stroke-width="1.75" />
                    <span>Go to Album</span>
                </button>

                <button class="ctx-item" @click="emit('edit')">
                    <Icon name="lucide:pencil" class="ctx-icon" :stroke-width="1.75" />
                    <span>Edit Details</span>
                </button>

                <div class="ctx-divider" />

                <button class="ctx-item ctx-item-danger" @click="emit('delete')">
                    <Icon name="lucide:trash-2" class="ctx-icon" :stroke-width="1.75" />
                    <span>Delete</span>
                </button>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
interface Photo {
    id: string
    originalName?: string
    albumId?: string | null
    dateTaken?: number | null
    createdAt?: number | null
}

const props = defineProps<{
    photo: Photo | null
    visible: boolean
    x: number
    y: number
}>()

const emit = defineEmits<{
    view: []
    download: []
    share: []
    'go-to-album': []
    edit: []
    delete: []
    close: []
}>()

const menuEl = ref<HTMLElement | null>(null)

const menuStyle = computed(() => {
    if (!import.meta.client) return {}

    const MENU_W = 220
    const MENU_H = 310
    const GAP = 8

    let left = props.x + GAP
    let top = props.y + GAP

    if (left + MENU_W > window.innerWidth - GAP) {
        left = props.x - MENU_W - GAP
    }
    if (top + MENU_H > window.innerHeight - GAP) {
        top = window.innerHeight - MENU_H - GAP
    }
    left = Math.max(GAP, left)
    top = Math.max(GAP, top)

    return { left: `${left}px`, top: `${top}px` }
})

function formatDate(ts?: number | null): string {
    if (!ts) return ''
    return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

// Close on outside click / escape
function onOutsideClick(e: MouseEvent) {
    if (props.visible && menuEl.value && !menuEl.value.contains(e.target as Node)) {
        emit('close')
    }
}
function onEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.visible) emit('close')
}

watch(() => props.visible, (v) => {
    if (import.meta.client) {
        if (v) {
            document.addEventListener('mousedown', onOutsideClick)
            document.addEventListener('keydown', onEscape)
        } else {
            document.removeEventListener('mousedown', onOutsideClick)
            document.removeEventListener('keydown', onEscape)
        }
    }
})

onUnmounted(() => {
    if (import.meta.client) {
        document.removeEventListener('mousedown', onOutsideClick)
        document.removeEventListener('keydown', onEscape)
    }
})
</script>

<style scoped>
.photo-ctx-menu {
    position: fixed;
    z-index: 9000;
    width: 220px;
    border-radius: 14px;
    padding: 6px;
    background: var(--surface-1);
    border: 1px solid var(--separator);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    overflow: hidden;
}

.ctx-header {
    padding: 8px 10px 6px;
}
.ctx-photo-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 190px;
}
.ctx-photo-date {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 1px;
}

.ctx-divider {
    height: 1px;
    background: var(--separator);
    margin: 4px 0;
}

.ctx-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s ease;
}
.ctx-item:hover {
    background: var(--surface-2);
}
.ctx-item:active {
    background: var(--surface-3);
}

.ctx-item-danger {
    color: var(--error);
}
.ctx-item-danger:hover {
    background: var(--error-bg);
}

.ctx-icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    opacity: 0.85;
}

/* Transition */
.ctx-menu-enter-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.ctx-menu-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.ctx-menu-enter-from { opacity: 0; transform: scale(0.94) translateY(-4px); }
.ctx-menu-leave-to { opacity: 0; transform: scale(0.94) translateY(-4px); }
</style>
