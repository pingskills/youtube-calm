import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      // content.js, popup.js, and options.js are browser-only UI scripts
      // that can't run in Node — exclude them from coverage so the report
      // reflects the testable surface accurately.
      include: ['src/lib/**', 'src/background/**'],
      reporter: ['text', 'html'],
    },
  },
});
