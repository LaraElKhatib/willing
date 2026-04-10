import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    css: true,
    include: [
      'src/**/*.unit.test.{ts,tsx}',
      'src/tests/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['src/tests/vitest.setup.ts'],
  },
});
