<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                style="background: var(--accent-light);">
                <Icon name="lucide:camera" class="w-8 h-8" style="color: var(--accent);" :stroke-width="1.5" />
            </div>
            <h1 class="text-2xl font-bold tracking-tight mb-1" style="color: var(--text-1);">PicHaus</h1>
            <p class="text-sm mb-6" style="color: var(--text-2);">Collaborative Photo Albums</p>
            <div class="flex items-center justify-center gap-2 text-sm" style="color: var(--text-3);">
                <span class="w-4 h-4 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></span>
                Redirecting…
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Redirect logic is handled by server middleware
// This page should never be seen as the server will redirect before rendering
</script>
