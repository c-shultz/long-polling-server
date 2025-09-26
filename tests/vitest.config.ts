import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,                         // lets you skip importing describe/it/expect
    include: ['**/*.{test,spec}.{js,ts}'], // match your current test pattern
  },
});
