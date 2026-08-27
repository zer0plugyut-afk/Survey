import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const empty = path.resolve(__dirname, 'src/shims/empty.ts')
const bbBrowser = path.resolve(__dirname, 'node_modules/@aztec/bb.js/dest/browser/index.js')
const nodeBuiltin = /^(node:)?(fs|path|url)$/

function stubNodeBuiltins(): Plugin {
  return {
    name: 'stub-node-builtins',
    resolveId(id, importer) {
      if (!nodeBuiltin.test(id)) return null
      if (id === 'fs' || id === 'node:fs') return empty
      if (importer && importer.includes('@interfold/sdk')) return empty
      return null
    },
  }
}

/** Stop Vite from walking @aztec/bb.js/src (generated cbind files only exist under dest/). */
function preferBbBrowserBuild(): Plugin {
  return {
    name: 'prefer-bb-browser-build',
    enforce: 'pre',
    resolveId(id) {
      if (id === '@aztec/bb.js' || id.startsWith('@aztec/bb.js/')) return bbBrowser
      // Absolute/relative hits into package src → redirect to browser build
      if (id.includes('@aztec/bb.js/src/') || id.replace(/\\/g, '/').includes('/@aztec/bb.js/src/')) {
        return bbBrowser
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [preferBbBrowserBuild(), stubNodeBuiltins(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      fs: empty,
      '@aztec/bb.js': bbBrowser,
    },
    conditions: ['browser', 'import', 'module', 'default'],
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@rollup/browser', '@interfold/wasm'],
    // Prebundle the browser build, never the unfinished src/ tree
    include: ['@aztec/bb.js'],
    esbuildOptions: {
      plugins: [
        {
          name: 'stub-node-builtins-esbuild',
          setup(build) {
            build.onResolve({ filter: nodeBuiltin }, (args) => {
              if (args.path === 'fs' || args.path === 'node:fs') return { path: empty }
              if (args.importer?.includes('@interfold/sdk')) return { path: empty }
              return undefined
            })
            build.onResolve({ filter: /^@aztec\/bb\.js/ }, () => ({ path: bbBrowser }))
          },
        },
      ],
    },
  },
  server: {
    port: 5173,
    open: false,
    hmr: {
      overlay: true,
    },
  },
})
