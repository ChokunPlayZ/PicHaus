import tsParser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
    {
        ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'dist/**', 'app/generated/**'],
    },
    {
        files: ['**/*.{js,ts}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        },
        rules: {
            'no-constant-condition': 'error',
            'no-debugger': 'error',
            'no-dupe-else-if': 'error',
            'no-unreachable': 'error',
        },
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module', extraFileExtensions: ['.vue'] },
        },
        plugins: { vue: vuePlugin },
        rules: {
            'no-debugger': 'error',
            'no-unreachable': 'error',
            'vue/no-parsing-error': 'error',
            'vue/no-dupe-keys': 'error',
            'vue/no-mutating-props': 'error',
        },
    },
]
