<template>
    <div class="min-h-screen bg-gradient-to-br from-[var(--bg-primary-start)] to-[var(--bg-primary-end)]">
        <NavBar title="📚 API Docs" :solid="true" />

        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h1 class="text-3xl font-bold text-white mb-2">External API Documentation</h1>
                <p class="text-purple-200">
                    Use your API token in the Authorization header.
                    All endpoints return JSON with a <span class="text-white">success</span> field.
                </p>
                <div class="mt-4 bg-black/30 border border-white/10 rounded-lg p-4">
                    <p class="text-xs text-purple-300 mb-1">Header</p>
                    <code class="text-sm text-green-300">Authorization: Bearer &lt;your_api_token&gt;</code>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                    <h2 class="text-xl font-bold text-white mb-3">Scopes</h2>
                    <ul class="space-y-2 text-purple-200 text-sm">
                        <li><span class="text-white font-semibold">albums:read</span> — read album list and album detail</li>
                        <li><span class="text-white font-semibold">photos:read</span> — read photos and random photo endpoints</li>
                    </ul>
                </div>

                <div class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                    <h2 class="text-xl font-bold text-white mb-3">Quick Example</h2>
                    <div class="bg-black/30 border border-white/10 rounded-lg p-4 overflow-x-auto">
                        <code class="text-sm text-green-300 whitespace-pre">curl -H "Authorization: Bearer $TOKEN" \\
  "${baseUrl}/api/external/albums?page=1&limit=20"</code>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <h2 class="text-2xl font-bold text-white">Endpoints</h2>
                <div v-for="endpoint in endpoints" :key="endpoint.path"
                    class="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                    <div class="flex flex-wrap items-center gap-3 mb-3">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="methodClass(endpoint.method)">
                            {{ endpoint.method }}
                        </span>
                        <code class="text-sm text-purple-200">{{ endpoint.path }}</code>
                        <span class="text-xs text-white/60">Scope: {{ endpoint.scope }}</span>
                    </div>

                    <p class="text-white/90 mb-4">{{ endpoint.description }}</p>

                    <div v-if="endpoint.params.length > 0" class="mb-4">
                        <h3 class="text-sm font-semibold text-purple-200 mb-2">Query Params</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div v-for="param in endpoint.params" :key="`${endpoint.path}-${param.name}`"
                                class="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-white font-medium">{{ param.name }}</span>
                                    <span class="text-xs text-purple-300">{{ param.type }}</span>
                                </div>
                                <p class="text-white/70 mt-1">{{ param.description }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-black/30 border border-white/10 rounded-lg p-4 overflow-x-auto">
                        <code class="text-sm text-green-300 whitespace-pre">{{ endpoint.example }}</code>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const requestUrl = useRequestURL()
const baseUrl = requestUrl.origin

useSeoMeta({
    title: 'API Docs | PicHaus',
    description: 'External API docs for PicHaus',
})

type EndpointParam = {
    name: string
    type: string
    description: string
}

type EndpointDoc = {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    path: string
    scope: string
    description: string
    params: EndpointParam[]
    example: string
}

const endpoints: EndpointDoc[] = [
    {
        method: 'GET',
        path: '/api/external/albums',
        scope: 'albums:read',
        description: 'List albums with pagination, searching, tag filtering, visibility filtering, sorting, and timeline summary.',
        params: [
            { name: 'page', type: 'number', description: 'Page number (default: 1).' },
            { name: 'limit', type: 'number', description: 'Items per page (1-100, default: 20).' },
            { name: 'q', type: 'string', description: 'Search in title and description.' },
            { name: 'tag', type: 'string', description: 'Single required tag.' },
            { name: 'tags', type: 'string', description: 'Comma-separated tags, matches any.' },
            { name: 'visibility', type: 'string', description: 'all | public | private.' },
            { name: 'sortBy', type: 'string', description: 'createdAt | updatedAt | eventDate | title.' },
            { name: 'order', type: 'string', description: 'asc | desc.' }
        ],
        example: 'curl -H "Authorization: Bearer $TOKEN" \\\n  "' + baseUrl + '/api/external/albums?q=wedding&tag=portrait&sortBy=eventDate&order=desc"'
    },
    {
        method: 'GET',
        path: '/api/external/albums/:id',
        scope: 'albums:read',
        description: 'Get one album detail including tags, counts, cover photo URLs, and linked resource URLs.',
        params: [],
        example: 'curl -H "Authorization: Bearer $TOKEN" \\\n  "' + baseUrl + '/api/external/albums/<album_id>"'
    },
    {
        method: 'GET',
        path: '/api/external/albums/:id/photos',
        scope: 'photos:read',
        description: 'Get paginated photos for an album with orientation/date filters and sorting.',
        params: [
            { name: 'page', type: 'number', description: 'Page number.' },
            { name: 'limit', type: 'number', description: 'Items per page (1-100).' },
            { name: 'orientation', type: 'string', description: 'any | landscape | portrait | square.' },
            { name: 'sortBy', type: 'string', description: 'createdAt | dateTaken | originalName.' },
            { name: 'order', type: 'string', description: 'asc | desc.' },
            { name: 'fromDateTaken', type: 'unix', description: 'Minimum dateTaken Unix timestamp.' },
            { name: 'toDateTaken', type: 'unix', description: 'Maximum dateTaken Unix timestamp.' }
        ],
        example: 'curl -H "Authorization: Bearer $TOKEN" \\\n  "' + baseUrl + '/api/external/albums/<album_id>/photos?orientation=landscape&sortBy=dateTaken"'
    },
    {
        method: 'GET',
        path: '/api/external/albums/:id/random',
        scope: 'photos:read',
        description: 'Get random photos from one album with optional orientation/date filters.',
        params: [
            { name: 'count', type: 'number', description: 'Number of photos (1-50).' },
            { name: 'orientation', type: 'string', description: 'any | landscape | portrait | square.' },
            { name: 'fromDateTaken', type: 'unix', description: 'Minimum dateTaken Unix timestamp.' },
            { name: 'toDateTaken', type: 'unix', description: 'Maximum dateTaken Unix timestamp.' }
        ],
        example: 'curl -H "Authorization: Bearer $TOKEN" \\\n  "' + baseUrl + '/api/external/albums/<album_id>/random?count=12&orientation=portrait"'
    },
    {
        method: 'GET',
        path: '/api/external/photos/random',
        scope: 'photos:read',
        description: 'Get random photos across albums with album/tag/visibility/orientation/date filters.',
        params: [
            { name: 'count', type: 'number', description: 'Number of photos (1-50).' },
            { name: 'albumId', type: 'uuid', description: 'Restrict to one album ID.' },
            { name: 'tag', type: 'string', description: 'Restrict to albums containing this tag.' },
            { name: 'visibility', type: 'string', description: 'all | public | private.' },
            { name: 'orientation', type: 'string', description: 'any | landscape | portrait | square.' },
            { name: 'fromDateTaken', type: 'unix', description: 'Minimum dateTaken Unix timestamp.' },
            { name: 'toDateTaken', type: 'unix', description: 'Maximum dateTaken Unix timestamp.' }
        ],
        example: 'curl -H "Authorization: Bearer $TOKEN" \\\n  "' + baseUrl + '/api/external/photos/random?count=24&tag=night&visibility=public"'
    }
]

const methodClass = (method: EndpointDoc['method']) => {
    if (method === 'GET') return 'bg-green-500/20 text-green-300 border border-green-500/30'
    if (method === 'POST') return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    if (method === 'PATCH') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
    if (method === 'PUT') return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
    return 'bg-red-500/20 text-red-300 border border-red-500/30'
}
</script>
