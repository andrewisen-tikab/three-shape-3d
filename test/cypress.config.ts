import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:4173/examples/examples/examples/',
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
    },
});
