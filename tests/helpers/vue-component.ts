import { readFileSync } from 'node:fs'
import { compileScript, parse } from 'vue/compiler-sfc'
import { ModuleKind, transpileModule } from 'typescript'
import { computed, createRenderer, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as vueRuntime from 'vue'
import { usePaginatedList } from '../../app/composables/usePaginatedList'
import { useJustifiedLayout } from '../../app/composables/useJustifiedLayout'

// Exercise the real SFC setup and template without adding a browser/DOM dependency.
export interface TestNode {
    tag: string
    text: string
    props: Record<string, any>
    parent: TestNode | null
    children: TestNode[]
    focus: () => void
    addEventListener: (type: string, listener: (event: any) => void) => void
    removeEventListener: (type: string, listener: (event: any) => void) => void
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number }
}
function node(tag: string, text = ''): TestNode {
    return {
        tag, text, props: {}, parent: null, children: [], focus: () => {},
        addEventListener() {}, removeEventListener() {},
        getBoundingClientRect: () => tag === 'img'
            ? { left: 100, top: 150, width: 400, height: 300 }
            : { left: 0, top: 0, width: 600, height: 600 },
    }
}
const renderer = createRenderer<TestNode, TestNode>({
    createElement: tag => node(tag), createText: text => node('#text', text), createComment: () => node('#comment'),
    setText: (el, text) => { el.text = text },
    setElementText: (el, text) => { el.text = text; el.children = [] },
    patchProp: (el, key, _old, value) => { el.props[key] = value },
    parentNode: el => el.parent,
    nextSibling: el => el.parent?.children[el.parent.children.indexOf(el) + 1] || null,
    insert(el, parent, anchor) {
        if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
        el.parent = parent
        const index = anchor ? parent.children.indexOf(anchor) : -1
        parent.children.splice(index < 0 ? parent.children.length : index, 0, el)
    },
    remove(el) {
        if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
        el.parent = null
    },
})

export function mountVueFile(path: string, globals: Record<string, any>, props: Record<string, any> = {}) {
    const { descriptor } = parse(readFileSync(path, 'utf8'))
    const script = compileScript(descriptor, { id: path, inlineTemplate: true })
    const code = transpileModule(script.content, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText
    const imports = {
        computed, ref, watch, onMounted, onUnmounted, nextTick, usePaginatedList, useJustifiedLayout,
        definePageMeta: () => {}, ...globals,
    }
    const exports: any = {}
    const modules: Record<string, any> = {
        '#app': { navigateTo: globals.navigateTo },
        '~/utils/auth-client': { buildAssetUrl: (path: string) => path, getAuthToken: () => globals.authToken },
        '~/utils/i18n': { t: (key: string) => key, initLanguage: () => {} },
    }
    // Compiler-generated render helpers come from Vue too.
    const component = new Function('require', 'exports', ...Object.keys(imports), `${code}\nreturn exports.default`)(
        (name: string) => {
            if (name === 'vue') return vueRuntime
            if (!modules[name]) throw new Error(`Unexpected import: ${name}`)
            return modules[name]
        }, exports, ...Object.values(imports),
    )
    const app = renderer.createApp(component, props)
    for (const name of ['Icon', 'NavBar', 'InfiniteScrollTrigger']) app.component(name, { render: () => h('stub') })
    app.component('PhotoViewer', { render: () => h('photo-viewer') })
    app.component('PhotoTile', { setup: (_props, { slots }) => () => h('photo-tile', slots.default?.()) })
    app.component('NuxtLink', {
        props: ['to'],
        setup: (props, { slots }) => () => h('a', { href: props.to }, slots.default?.()),
    })
    const root = node('root')
    app.mount(root)
    return { root, app }
}

export function nodes(root: TestNode): TestNode[] {
    return [root, ...root.children.flatMap(nodes)]
}
export function text(root: TestNode): string {
    return nodes(root).map(el => el.text).join(' ')
}
export async function flushComponent() {
    for (let i = 0; i < 5; i++) await nextTick()
}
