/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base relativa: o build funciona na raiz de um domínio ou numa subpasta (ex.: GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
