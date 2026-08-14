<template>
  <Transition name="command-palette-fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4"
      @click.self="closePalette"
    >
      <!-- Backdrop with blur -->
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closePalette"></div>

      <!-- Palette panel -->
      <div
        class="relative w-full max-w-lg overflow-hidden flex flex-col bg-surface-1 border border-separator rounded-2xl shadow-2xl transition-all"
      >
        <!-- Search field -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-separator">
          <!-- Search Icon (magnifying glass) -->
          <Icon
            name="lucide:search"
            class="w-5 h-5 shrink-0"
            style="color: var(--text-3);"
            :stroke-width="2"
          />
          <!-- Input -->
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Search pages, albums, actions..."
            class="w-full bg-transparent text-text-1 placeholder-text-3 outline-none text-sm border-none focus:ring-0 p-0"
            style="outline: none;"
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="selectItem"
            @keydown.esc.prevent="closePalette"
          />
          <!-- ESC key badge -->
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded" style="background-color: var(--surface-2); border-color: var(--separator); color: var(--text-3);">ESC</kbd>
        </div>

        <!-- Suggestions / Results -->
        <div
          v-if="filteredItems.length > 0"
          class="max-h-[320px] overflow-y-auto p-2 space-y-0.5"
          ref="resultsContainer"
        >
          <div
            v-for="(item, index) in filteredItems"
            :key="item.id"
            class="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm"
            :class="index === selectedIndex ? 'bg-surface-3' : 'hover:bg-surface-2'"
            @click="executeItem(item)"
            @mouseenter="selectedIndex = index"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- Item icon -->
              <div class="w-5 h-5 flex items-center justify-center shrink-0" style="color: var(--text-2);">
                <Icon :name="getIconName(item.icon)" class="w-4 h-4" :stroke-width="2" />
              </div>

              <!-- Label & Subtitle -->
              <div class="flex flex-col min-w-0">
                <span class="font-medium truncate text-text-1">{{ item.label }}</span>
                <span v-if="item.subtitle" class="text-xs truncate text-text-3">{{ item.subtitle }}</span>
              </div>
            </div>

            <!-- Section name / Shortcut indicator -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded" style="background-color: var(--surface-2); color: var(--text-2);">
                {{ item.section }}
              </span>
            </div>
          </div>
        </div>

        <!-- No results state -->
        <div v-else class="p-8 text-center text-sm animate-fade-in" style="color: var(--text-2);">
          No results found for "<span class="font-medium text-text-1">{{ searchQuery }}</span>"
        </div>

        <!-- Footer / Shortcuts guide -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-separator text-xs" style="color: var(--text-3);">
          <div class="flex items-center gap-3">
            <span><kbd class="px-1 py-0.5 rounded border" style="background-color: var(--surface-2); border-color: var(--separator);">↑↓</kbd> to navigate</span>
            <span><kbd class="px-1 py-0.5 rounded border" style="background-color: var(--surface-2); border-color: var(--separator);">↵</kbd> to select</span>
          </div>
          <div>
            <span>Press <kbd class="px-1 py-0.5 rounded border" style="background-color: var(--surface-2); border-color: var(--separator);">esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getAuthToken, clearAuthToken } from '~/utils/auth-client'

const isOpen = useState<boolean>('command-palette-open', () => false)
const searchQuery = ref('')
const selectedIndex = ref(0)
const albums = ref<any[]>([])

const searchInput = ref<HTMLInputElement | null>(null)
const resultsContainer = ref<HTMLElement | null>(null)

const route = useRoute()

// Share album creation states with album index page
const showCreateModal = useState<boolean>('show-create-album-modal', () => false)
const showShareGroupModal = useState<boolean>('show-create-share-group-modal', () => false)

// Share user state with NavBar
const user = useState<any>('navbar-user', () => null)

const fetchUserIfNeeded = async () => {
  if (!user.value && getAuthToken()) {
    try {
      const response = await $fetch<{ success: boolean; data: any }>('/api/v1/auth/me')
      if (response?.data) {
        user.value = response.data
      }
    } catch (e) {
      console.error('Failed to fetch user in command palette', e)
    }
  }
}

const fetchAlbums = async () => {
  if (!getAuthToken()) return
  try {
    const response = await $fetch<{ success: boolean; data: any[] }>('/api/v1/album')
    if (response?.success && Array.isArray(response.data)) {
      albums.value = response.data
    }
  } catch (e) {
    console.error('Failed to fetch albums for command palette', e)
  }
}

// Watch isOpen to toggle background scrolling and auto-focus
watch(isOpen, async (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      searchInput.value?.focus()
    })
    await fetchUserIfNeeded()
    await fetchAlbums()
  } else {
    document.body.style.overflow = ''
    searchQuery.value = ''
    selectedIndex.value = 0
  }
})

// Global keyboard listeners
const handleKeyDown = (e: KeyboardEvent) => {
  // Check for CMD+K or CTRL+K
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    // Only open if the user has an auth token (logged in)
    if (getAuthToken()) {
      e.preventDefault()
      isOpen.value = !isOpen.value
    }
  }
}

const closePalette = () => {
  isOpen.value = false
}

// Build all command options
const allCommands = computed(() => {
  const items: any[] = []

  // 1. Navigation / Pages
  items.push({
    id: 'nav-albums',
    label: 'Albums',
    subtitle: 'View all photo albums',
    icon: 'albums',
    section: 'Pages',
    action: () => navigateTo('/album')
  })

  items.push({
    id: 'nav-photos',
    label: 'Photos',
    subtitle: 'View timeline of all photos',
    icon: 'photos',
    section: 'Pages',
    action: () => navigateTo('/photos')
  })

  items.push({
    id: 'nav-people',
    label: 'People',
    subtitle: 'Browse recognized people in your library',
    icon: 'people',
    section: 'Pages',
    action: () => navigateTo('/people')
  })

  items.push({
    id: 'nav-statistics',
    label: 'Statistics',
    subtitle: 'View server statistics and storage usage',
    icon: 'statistics',
    section: 'Pages',
    action: () => navigateTo('/statistics')
  })

  items.push({
    id: 'nav-share-links',
    label: 'Share Links',
    subtitle: 'Manage shared albums links',
    icon: 'share-links',
    section: 'Pages',
    action: () => navigateTo('/share-links')
  })

  items.push({
    id: 'nav-docs',
    label: 'API Docs',
    subtitle: 'Developer API documentation',
    icon: 'docs',
    section: 'Pages',
    action: () => navigateTo('/docs')
  })

  items.push({
    id: 'nav-api-keys',
    label: 'API Keys',
    subtitle: 'Manage developer API tokens',
    icon: 'api-keys',
    section: 'Pages',
    action: () => navigateTo('/api-tokens')
  })

  items.push({
    id: 'nav-settings',
    label: 'Account Settings',
    subtitle: 'Manage your profile and settings',
    icon: 'settings',
    section: 'Pages',
    action: () => navigateTo('/settings')
  })

  // 2. Admin actions (if admin)
  if (user.value?.role === 'ADMIN') {
    items.push({
      id: 'admin-users',
      label: 'Manage Users',
      subtitle: 'Create and update user accounts',
      icon: 'users',
      section: 'Admin',
      action: () => navigateTo('/admin/users')
    })

    items.push({
      id: 'admin-status',
      label: 'Server Status',
      subtitle: 'Check system health and status details',
      icon: 'status',
      section: 'Admin',
      action: () => navigateTo('/admin/status')
    })

    items.push({
      id: 'admin-invites',
      label: 'Invites',
      subtitle: 'Manage pending user registration invitations',
      icon: 'invites',
      section: 'Admin',
      action: () => navigateTo('/admin/invites')
    })

    items.push({
      id: 'admin-settings',
      label: 'Site Settings',
      subtitle: 'Customize application theme, name and logo',
      icon: 'settings',
      section: 'Admin',
      action: () => navigateTo('/admin/settings')
    })
  }

  // 3. Dynamic Album navigation
  albums.value.forEach(album => {
    const photoCount = album._count?.photos ?? 0
    items.push({
      id: `album-${album.id}`,
      label: album.name,
      subtitle: `${album.description || ''} (${photoCount} photo${photoCount === 1 ? '' : 's'})`.trim(),
      icon: 'albums',
      section: 'Albums',
      action: () => navigateTo(`/album/${album.id}`)
    })
  })

  // 4. Global Actions
  items.push({
    id: 'action-create-album',
    label: 'Create Album',
    subtitle: 'Create a new collaborative photo album',
    icon: 'plus',
    section: 'Actions',
    action: async () => {
      if (route.path !== '/album') {
        await navigateTo('/album')
      }
      showCreateModal.value = true
    }
  })

  items.push({
    id: 'action-create-share-group',
    label: 'Create Share Group',
    subtitle: 'Group multiple albums together into a single share link',
    icon: 'share',
    section: 'Actions',
    action: async () => {
      if (route.path !== '/album') {
        await navigateTo('/album')
      }
      showShareGroupModal.value = true
    }
  })

  items.push({
    id: 'action-logout',
    label: 'Sign Out',
    subtitle: 'Sign out of your account',
    icon: 'logout',
    section: 'Actions',
    action: handleLogout
  })

  return items
})

// Filter commands based on search query
const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return allCommands.value

  return allCommands.value.filter(item =>
    item.label.toLowerCase().includes(query) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(query)) ||
    item.section.toLowerCase().includes(query)
  )
})

watch(searchQuery, () => {
  selectedIndex.value = 0
})

// Keyboard navigation in suggestions list
const navigateDown = () => {
  if (filteredItems.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
  scrollToSelected()
}

const navigateUp = () => {
  if (filteredItems.value.length === 0) return
  selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
  scrollToSelected()
}

const selectItem = () => {
  if (filteredItems.value.length === 0) return
  const item = filteredItems.value[selectedIndex.value]
  if (item) {
    executeItem(item)
  }
}

const executeItem = (item: any) => {
  isOpen.value = false
  item.action()
}

const handleLogout = async () => {
  try {
    await $fetch('/api/v1/auth/logout', { method: 'POST' })
    clearAuthToken()
    window.location.href = '/login'
  } catch (err) {
    console.error('Logout failed', err)
  }
}

// Adjust scroll position of suggestions container to keep active item visible
const scrollToSelected = () => {
  nextTick(() => {
    const container = resultsContainer.value
    if (!container) return
    const selectedElement = container.children[selectedIndex.value] as HTMLElement
    if (!selectedElement) return

    const containerTop = container.scrollTop
    const containerBottom = containerTop + container.clientHeight
    const elemTop = selectedElement.offsetTop
    const elemBottom = elemTop + selectedElement.offsetHeight

    if (elemTop < containerTop) {
      container.scrollTop = elemTop
    } else if (elemBottom > containerBottom) {
      container.scrollTop = elemBottom - container.clientHeight
    }
  })
}

// Map icon string from command schema to Lucide icon
const getIconName = (icon: string) => {
  const map: Record<string, string> = {
    'albums': 'lucide:folder',
    'photos': 'lucide:image',
    'people': 'lucide:users',
    'statistics': 'lucide:bar-chart-3',
    'share-links': 'lucide:link',
    'docs': 'lucide:file-text',
    'api-keys': 'lucide:key',
    'settings': 'lucide:settings',
    'logout': 'lucide:log-out',
    'users': 'lucide:users',
    'status': 'lucide:activity',
    'invites': 'lucide:mail',
    'plus': 'lucide:plus',
    'share': 'lucide:share-2'
  }
  return map[icon] || 'lucide:chevron-right'
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.command-palette-fade-enter-active,
.command-palette-fade-leave-active {
  transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.command-palette-fade-enter-from,
.command-palette-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
