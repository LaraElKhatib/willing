import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
    },
    globalSetup: './src/tests/globalSetup.ts',
    setupFiles: [
      './src/tests/setup.ts',
    ],
    fileParallelism: true,
  },
});
