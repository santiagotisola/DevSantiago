import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', '**/dist/**', '**/*.js', 'src/test/it/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/modules/**/*.service.ts'],
      exclude: [
        'node_modules',
        '**/dist/**',
        'src/test/**',
        '**/*.test.ts',
        '**/*.routes.ts',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 25,
        statements: 30,
      },
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
