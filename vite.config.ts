/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // agent worktrees live under .claude/ — never pick up their copies of the tests
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
