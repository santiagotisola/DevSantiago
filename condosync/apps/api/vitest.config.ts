import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', '**/dist/**', '**/*.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/modules/auth/auth.service.ts',
        'src/modules/finance/finance.service.ts',
        'src/modules/visitors/visitor.service.ts',
        'src/modules/parcels/parcel.service.ts',
      ],
      exclude: ['node_modules', '**/dist/**', 'src/test/**'],
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
