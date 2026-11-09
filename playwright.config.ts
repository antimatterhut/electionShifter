import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}/electionShifter/` },
  webServer: {
    // Serves the built dist/ at the production base path.
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/electionShifter/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
