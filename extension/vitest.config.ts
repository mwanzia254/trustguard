import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  define: {
    // Provide a default value for the build-time constant during tests
    __API_URL__: JSON.stringify('http://localhost:5000/api'),
  },
});
