import { fileURLToPath, URL } from 'node:url';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    logLevel: 'error',
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:7070',
                changeOrigin: true
            },
            '/auth': {
                target: 'http://localhost:7070',
                changeOrigin: true
            },
            '/survey': {
                target: 'http://localhost:7070',
                changeOrigin: true
            },
            '/rolik': {
                target: 'http://localhost:7070',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: './dist',
        emptyOutDir: true
      },

    optimizeDeps: {
        noDiscovery: true
    },
    plugins: [
        vue(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});
