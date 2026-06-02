import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

export default defineConfig({
    resolve: {
        alias: [
            { find: /^~\/(.*)/, replacement: `${root}/$1` },
            { find: /^@\/(.*)/, replacement: `${root}/$1` },
        ],
    },
    // The project tsconfig extends ./.nuxt/tsconfig.json which only exists after
    // `nuxt prepare`. Tests don't need it — give esbuild an empty config so it
    // doesn't try to resolve that extends chain.
    esbuild: {
        tsconfigRaw: '{}',
    },
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
    },
})
