/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import { defineConfig, type Plugin } from 'vite'

/**
 * <link rel="preload"> for the fonts of the first Home paint (body text + the serif brand title), so they arrive with
 * the CSS instead of after the JS has rendered the page (no late font swap). Other weights / scripts load on demand.
 */
function preloadCriticalFonts(patterns: RegExp[]): Plugin {
  return {
    name: 'b125-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return [];
        return Object.keys(ctx.bundle)
          .filter(f => patterns.some(p => p.test(f)))
          .map(f => ({ tag: 'link', injectTo: 'head' as const, attrs: { rel: 'preload', href: '/' + f, as: 'font', type: 'font/woff2', crossorigin: '' } }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    preloadCriticalFonts([/golos-text-latin-400-normal-[\w-]+\.woff2$/, /cormorant-garamond-latin-700-normal-[\w-]+\.woff2$/]),
  ],
  build: {
    rolldownOptions: {
      output: {
        // long-lived vendor chunks: app deploys don't invalidate them, and the Supabase SDK stays out of the first paint
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/, priority: 20 },
            { name: 'supabase', test: /node_modules[\\/](@supabase|iceberg-js)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    // agent worktrees live under .claude/ — never pick up their copies of the tests
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
