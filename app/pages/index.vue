<template>
    <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-page);">
        <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                style="background: var(--accent-light);">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" style="color: var(--accent);">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M3 7a2 2 0 012-2h3l1.5-2h5L16 5h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.5" />
                </svg>
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
