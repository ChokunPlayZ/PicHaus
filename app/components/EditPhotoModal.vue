<template>
    <Teleport to="body">
        <Transition name="modal-backdrop">
            <div
                v-if="modelValue"
                class="fixed inset-0 z-[8000] flex items-center justify-center p-4"
                style="background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);"
                @click.self="close"
            >
                <Transition name="modal-panel">
                    <div
                        v-if="modelValue"
                        class="modal-card"
                    >
                        <!-- Header -->
                        <div class="modal-header">
                            <div>
                                <h2 class="modal-title">Edit Photo Details</h2>
                                <p class="modal-subtitle">{{ photo?.originalName }}</p>
                            </div>
                            <button class="modal-close-btn" @click="close" aria-label="Close">
                                <Icon name="lucide:x" class="w-5 h-5" :stroke-width="2" />
                            </button>
                        </div>

                        <!-- Form -->
                        <div class="modal-body">
                            <div class="field-grid">
                                <!-- Date Taken -->
                                <div class="field-group full-width">
                                    <label class="field-label">
                                        <Icon name="lucide:calendar" class="label-icon" :stroke-width="1.75" />
                                        Date Taken
                                    </label>
                                    <input
                                        v-model="form.dateTakenDisplay"
                                        type="datetime-local"
                                        class="field-input"
                                        placeholder="YYYY-MM-DD HH:MM"
                                    />
                                </div>

                                <!-- Camera Model -->
                                <div class="field-group">
                                    <label class="field-label">
                                        <Icon name="lucide:camera" class="label-icon" :stroke-width="1.75" />
                                        Camera
                                    </label>
                                    <input
                                        v-model="form.cameraModel"
                                        type="text"
                                        class="field-input"
                                        placeholder="e.g. Sony A7 IV"
                                    />
                                </div>

                                <!-- Lens -->
                                <div class="field-group">
                                    <label class="field-label">
                                        <Icon name="lucide:scan" class="label-icon" :stroke-width="1.75" />
                                        Lens
                                    </label>
                                    <input
                                        v-model="form.lens"
                                        type="text"
                                        class="field-input"
                                        placeholder="e.g. 85mm f/1.4"
                                    />
                                </div>

                                <!-- Focal Length -->
                                <div class="field-group">
                                    <label class="field-label">
                                        <Icon name="lucide:telescope" class="label-icon" :stroke-width="1.75" />
                                        Focal Length
                                    </label>
                                    <input
                                        v-model="form.focalLength"
                                        type="text"
                                        class="field-input"
                                        placeholder="e.g. 85mm"
                                    />
                                </div>

                                <!-- Aperture -->
                                <div class="field-group">
                                    <label class="field-label">
                                        <Icon name="lucide:aperture" class="label-icon" :stroke-width="1.75" />
                                        Aperture
                                    </label>
                                    <input
                                        v-model="form.aperture"
                                        type="text"
                                        class="field-input"
                                        placeholder="e.g. f/1.8"
                                    />
                                </div>

                                <!-- Shutter Speed -->
                                <div class="field-group">
                                    <label class="field-label">
                                        <Icon name="lucide:timer" class="label-icon" :stroke-width="1.75" />
                                        Shutter Speed
                                    </label>
                                    <input
                                        v-model="form.shutterSpeed"
                                        type="text"
                                        class="field-input"
                                        placeholder="e.g. 1/500"
                                    />
                                </div>

                                <!-- ISO -->
                                <div class="field-group">
                                    <label class="field-label">
                                        <Icon name="lucide:sun" class="label-icon" :stroke-width="1.75" />
                                        ISO
                                    </label>
                                    <input
                                        v-model="form.iso"
                                        type="number"
                                        class="field-input"
                                        placeholder="e.g. 400"
                                        min="50"
                                        max="102400"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="modal-footer">
                            <button class="btn-secondary" @click="close" :disabled="saving">Cancel</button>
                            <button class="btn-primary" @click="save" :disabled="saving">
                                <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                                <span>{{ saving ? 'Saving…' : 'Save Changes' }}</span>
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
interface Photo {
    id: string
    originalName?: string
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
    dateTaken?: number | null
}

const props = defineProps<{
    modelValue: boolean
    photo: Photo | null
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: [photo: Photo]
}>()

const { toast } = useDialog()

const saving = ref(false)

const form = reactive({
    dateTakenDisplay: '',
    cameraModel: '',
    lens: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    iso: '' as number | string,
})

// Populate form when photo changes
watch(() => props.photo, (p) => {
    if (!p) return
    form.cameraModel = p.cameraModel || ''
    form.lens = p.lens || ''
    form.focalLength = p.focalLength || ''
    form.aperture = p.aperture || ''
    form.shutterSpeed = p.shutterSpeed || ''
    form.iso = p.iso ?? ''
    if (p.dateTaken) {
        const d = new Date(p.dateTaken * 1000)
        // datetime-local format: YYYY-MM-DDTHH:MM
        const pad = (n: number) => String(n).padStart(2, '0')
        form.dateTakenDisplay = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } else {
        form.dateTakenDisplay = ''
    }
}, { immediate: true })

function close() {
    emit('update:modelValue', false)
}

async function save() {
    if (!props.photo) return
    saving.value = true
    try {
        let dateTaken: number | undefined
        if (form.dateTakenDisplay) {
            const d = new Date(form.dateTakenDisplay)
            if (!isNaN(d.getTime())) {
                dateTaken = Math.floor(d.getTime() / 1000)
            }
        }
        const body: Record<string, any> = {
            cameraModel: form.cameraModel || null,
            lens: form.lens || null,
            focalLength: form.focalLength || null,
            aperture: form.aperture || null,
            shutterSpeed: form.shutterSpeed || null,
            iso: form.iso !== '' ? Number(form.iso) : null,
        }
        if (dateTaken !== undefined) body.dateTaken = dateTaken

        const res: any = await $fetch(`/api/v1/photo/${props.photo.id}`, {
            method: 'PATCH',
            body,
        })
        toast('Photo details saved', 'success')
        emit('saved', { ...props.photo, ...res.data })
        close()
    } catch (e: any) {
        toast(e?.data?.statusMessage || 'Failed to save changes', 'error')
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.modal-card {
    width: 100%;
    max-width: 520px;
    border-radius: 20px;
    overflow: hidden;
    background: var(--surface-1);
    border: 1px solid var(--separator);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--separator);
    flex-shrink: 0;
}
.modal-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-1);
    line-height: 1.2;
}
.modal-subtitle {
    font-size: 12px;
    color: var(--text-3);
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 340px;
}
.modal-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-2);
    border: 1px solid var(--separator);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-2);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
}
.modal-close-btn:hover {
    background: var(--surface-3);
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.full-width {
    grid-column: 1 / -1;
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.field-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.label-icon {
    width: 12px;
    height: 12px;
    opacity: 0.75;
}
.field-input {
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 13px;
    color: var(--text-1);
    background: var(--surface-2);
    border: 1px solid var(--separator);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
}
.field-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}
.field-input::placeholder {
    color: var(--text-3);
    opacity: 0.6;
}

.modal-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--separator);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
}

.btn-secondary {
    padding: 9px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
    background: var(--surface-2);
    border: 1px solid var(--separator);
    cursor: pointer;
    transition: background 0.15s;
}
.btn-secondary:hover:not(:disabled) {
    background: var(--surface-3);
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
    padding: 9px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-text);
    background: var(--accent);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Transitions */
.modal-backdrop-enter-active, .modal-backdrop-leave-active { transition: opacity 0.2s ease; }
.modal-backdrop-enter-from, .modal-backdrop-leave-to { opacity: 0; }

.modal-panel-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.modal-panel-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.modal-panel-enter-from { opacity: 0; transform: scale(0.96) translateY(10px); }
.modal-panel-leave-to { opacity: 0; transform: scale(0.96) translateY(6px); }

@media (max-width: 640px) {
    .field-grid {
        grid-template-columns: 1fr;
    }
    .full-width {
        grid-column: 1;
    }
}
</style>
