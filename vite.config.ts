import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    netlify(),
    tanstackStart(),
    viteReact(),
  ],

  // @clerk/backend is a Node server package (transitive dep of @clerk/tanstack-start).
  // It must NOT be bundled by Rollup — it resolves at runtime in the Netlify function.
  build: {
    rollupOptions: {
      external: ['@clerk/backend'],
    },
  },
  ssr: {
    external: ['@clerk/backend'],
  },
})

export default config
