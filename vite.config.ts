import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/electionShifter/',
  test: {
    // Playwright specs run under `playwright test`, not vitest.
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
