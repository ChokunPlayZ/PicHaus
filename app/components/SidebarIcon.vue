<template>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        :width="size" :height="size" :stroke-width="strokeWidth"
        stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        <!-- Albums: overlapping frames -->
        <template v-if="name === 'albums'">
            <rect x="3.5" y="7" width="12" height="10" rx="2" transform="rotate(-6 9.5 12)" />
            <rect x="8.5" y="5.5" width="12" height="10" rx="2" transform="rotate(5 14.5 10.5)" />
            <circle cx="14.5" cy="8.5" r="0.9" fill="currentColor" stroke="none" />
        </template>

        <!-- People: two figures -->
        <template v-else-if="name === 'people'">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.8 19c.5-3.4 2.4-5.2 5.2-5.2s4.7 1.8 5.2 5.2" />
            <path d="M15.5 5.5a3 3 0 1 1 .8 5.9" />
            <path d="M16.4 14c2 .3 3.5 1.8 3.9 4.6" />
        </template>

        <!-- Photos: landscape with sun + mountain -->
        <template v-else-if="name === 'photos'">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <circle cx="16.5" cy="9" r="1.4" />
            <path d="M3.5 15.5l4.2-3.8 3.6 3.2 3.2-2.7 5.5 4.6" />
        </template>

        <!-- Timeline: photos on a strip -->
        <template v-else-if="name === 'timeline'">
            <path d="M3.5 12.5h17" />
            <circle cx="7" cy="12.5" r="3" />
            <circle cx="17" cy="12.5" r="3" />
            <path d="M10 12.5h4" />
            <path d="M7 5.5v2M17 5.5v2M7 17.5v2M17 17.5v2" />
        </template>

        <!-- Statistics: rising bars + trend -->
        <template v-else-if="name === 'statistics'">
            <path d="M4 19.5h16" />
            <rect x="6" y="12" width="2.6" height="7.5" rx="0.8" />
            <rect x="10.7" y="8.5" width="2.6" height="11" rx="0.8" />
            <rect x="15.4" y="5" width="2.6" height="14.5" rx="0.8" />
            <path d="M5.5 11.5l3.8-2.8 3.4 1.6 4.8-4" />
        </template>

        <!-- Share links: chain rings -->
        <template v-else-if="name === 'share-links'">
            <path d="M9.5 14.5l5-5" />
            <path d="M7.5 13.5l-1.3 1.3a3.4 3.4 0 1 0 4.8 4.8l1.3-1.3" />
            <path d="M16.5 10.5l1.3-1.3a3.4 3.4 0 1 0-4.8-4.8l-1.3 1.3" />
        </template>

        <!-- Docs: page with text -->
        <template v-else-if="name === 'docs'">
            <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
            <path d="M14 3.5V8h4" />
            <path d="M8.5 12h7M8.5 15.5h5" />
        </template>

        <!-- API keys: key with star -->
        <template v-else-if="name === 'api-keys'">
            <circle cx="7.5" cy="12" r="3.6" />
            <path d="M10.4 9.6L20 19M15.5 14.5l2.8-2.8M17.5 12.5l2.8-2.8" />
            <path d="M12.8 17.2l.55 1.15 1.15.55-1.15.55-.55 1.15-.55-1.15-1.15-.55 1.15-.55z" fill="currentColor" stroke="none" />
        </template>

        <!-- Users (admin): person with badge -->
        <template v-else-if="name === 'users'">
            <circle cx="10" cy="8" r="3.4" />
            <path d="M4.2 19.5c.6-3.7 2.7-5.7 5.8-5.7s5.2 2 5.8 5.7" />
            <path d="M17.5 6.2a2.6 2.6 0 1 1 .6 5.1" />
        </template>

        <!-- Status: heartbeat -->
        <template v-else-if="name === 'status'">
            <path d="M3 12h4l2.2-5 3.6 10 2.2-5H21" />
        </template>

        <!-- Invites: envelope with spark -->
        <template v-else-if="name === 'invites'">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3.5 7.5l8.5 6 8.5-6" />
            <path d="M18.5 15.5l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z" fill="currentColor" stroke="none" />
        </template>

        <!-- Logos: image with badge -->
        <template v-else-if="name === 'logos'">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <circle cx="16" cy="8.5" r="1.3" />
            <path d="M3.5 15l4.5-4 4 3.5 3-2.5 5.5 4.5" />
        </template>

        <!-- Settings: sliders -->
        <template v-else-if="name === 'settings'">
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
            <circle cx="15" cy="7" r="2.2" />
            <circle cx="9" cy="17" r="2.2" />
        </template>

        <!-- Search: magnifier with spark -->
        <template v-else-if="name === 'search'">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="M15 15l5 5" />
            <path d="M8.5 9.5l.5 1 .5-.5" />
        </template>
    </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    name: string
    size?: number | string
    strokeWidth?: number | string
}>(), {
    size: 16,
    strokeWidth: 1.7,
})
</script>
