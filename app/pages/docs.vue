<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="API Docs" :solid="true" />

        <div class="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div class="rounded-2xl p-6"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="flex items-start justify-between gap-4 mb-1">
                    <h1 class="text-2xl font-bold" style="color: var(--text-1);">External API Documentation</h1>
                    <button @click="copyAsMarkdown"
                        class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                        :style="copied ? 'background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border);' : 'background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);'">
                        <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {{ copied ? 'Copied!' : 'Copy as Markdown' }}
                    </button>
                </div>
                <p class="text-sm mb-4" style="color: var(--text-2);">
                    Use your API token in the Authorization header.
                    All endpoints return JSON with a <code style="color: var(--text-1);">success</code> field.
                </p>
                <div class="rounded-xl p-4"
                    style="background: var(--surface-2); border: 1px solid var(--separator);">
                    <p class="text-xs font-semibold mb-1.5" style="color: var(--text-3);">Header</p>
                    <code class="text-sm font-mono" style="color: var(--accent);">Authorization: Bearer &lt;your_api_token&gt;</code>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-base font-semibold mb-3" style="color: var(--text-1);">Scopes</h2>
                    <ul class="space-y-2 text-sm">
                        <li style="color: var(--text-2);"><span class="font-semibold" style="color: var(--text-1);">albums:read</span> — read album list and album detail</li>
                        <li style="color: var(--text-2);"><span class="font-semibold" style="color: var(--text-1);">photos:read</span> — read photos and random photo endpoints</li>
                    </ul>
                </div>

                <div class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <h2 class="text-base font-semibold mb-3" style="color: var(--text-1);">Quick Example</h2>
                    <div class="rounded-xl p-4 overflow-x-auto"
                        style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <code class="text-xs font-mono whitespace-pre" style="color: var(--success-text);">curl -H "Authorization: Bearer $TOKEN" \
  "${baseUrl}/api/external/albums?page=1&limit=20"</code>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <h2 class="text-xl font-bold" style="color: var(--text-1);">Endpoints</h2>
                <div v-for="endpoint in endpoints" :key="endpoint.path"
                    class="rounded-2xl p-6"
                    style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                    <div class="flex flex-wrap items-center gap-3 mb-3">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="methodClass(endpoint.method)">
                            {{ endpoint.method }}
                        </span>
                        <code class="text-sm font-mono" style="color: var(--text-1);">{{ endpoint.path }}</code>
                        <span class="text-xs px-2 py-0.5 rounded-full" style="background: var(--surface-3); color: var(--text-3);">{{ endpoint.scope }}</span>
                    </div>

                    <p class="text-sm mb-4" style="color: var(--text-2);">{{ endpoint.description }}</p>

                    <div v-if="endpoint.params.length > 0" class="mb-4">
                        <h3 class="text-xs font-semibold uppercase tracking-wide mb-2" style="color: var(--text-3);">Query Params</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div v-for="param in endpoint.params" :key="`${endpoint.path}-${param.name}`"
                                class="rounded-xl p-3 text-sm"
                                style="background: var(--surface-2); border: 1px solid var(--separator);">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="font-medium font-mono" style="color: var(--text-1);">{{ param.name }}</span>
                                    <span class="text-xs px-1.5 py-0.5 rounded" style="background: var(--surface-3); color: var(--text-3);">{{ param.type }}</span>
                                </div>
                                <p class="mt-1 text-xs" style="color: var(--text-2);">{{ param.description }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-xl p-4 overflow-x-auto"
                        style="background: var(--surface-2); border: 1px solid var(--separator);">
                        <code class="text-xs font-mono whitespace-pre" style="color: var(--success-text);">{{ endpoint.example }}</code>
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
    if (method === 'GET') return 'method-get'
    if (method === 'POST') return 'method-post'
    if (method === 'PATCH') return 'method-patch'
    if (method === 'PUT') return 'method-put'
    return 'method-delete'
}

const copied = ref(false)

const copyAsMarkdown = async () => {
    const lines: string[] = []

    lines.push('# PicHaus External API Documentation')
    lines.push('')
    lines.push('Use your API token in the `Authorization` header. All endpoints return JSON with a `success` field.')
    lines.push('')
    lines.push('**Authentication:** `Authorization: Bearer <your_api_token>`')
    lines.push('')
    lines.push('## Scopes')
    lines.push('')
    lines.push('- **albums:read** — read album list and album detail')
    lines.push('- **photos:read** — read photos and random photo endpoints')
    lines.push('')
    lines.push('## Endpoints')

    for (const endpoint of endpoints) {
        lines.push('')
        lines.push(`### ${endpoint.method} \`${endpoint.path}\``)
        lines.push('')
        lines.push(`**Scope:** \`${endpoint.scope}\``)
        lines.push('')
        lines.push(endpoint.description)

        if (endpoint.params.length > 0) {
            lines.push('')
            lines.push('**Query Parameters:**')
            lines.push('')
            lines.push('| Parameter | Type | Description |')
            lines.push('|-----------|------|-------------|')
            for (const param of endpoint.params) {
                lines.push(`| \`${param.name}\` | \`${param.type}\` | ${param.description} |`)
            }
        }

        lines.push('')
        lines.push('**Example:**')
        lines.push('')
        lines.push('```sh')
        lines.push(endpoint.example)
        lines.push('```')
    }

    await navigator.clipboard.writeText(lines.join('\n'))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.method-get { background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border); }
.method-post { background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent); }
.method-patch { background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border); }
.method-put { background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent); opacity: 0.8; }
.method-delete { background: var(--error-bg); color: var(--error-text); border: 1px solid var(--error-border); }
</style>
