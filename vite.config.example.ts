import { resolve } from 'path';
import { defineConfig } from 'vite';
import { EXAMPLES } from './examples';

const input: { [key: string]: resolve } = {};

EXAMPLES.forEach((example) => {
    input[example] = resolve(__dirname, `examples/examples/${example}/index.html`);
});

export default defineConfig({
    base: './',
    build: {
        outDir: './dist/examples',
        minify: false,
        sourcemap: true,
        rollupOptions: {
            input,
            treeshake: false,
        },
    },
});
