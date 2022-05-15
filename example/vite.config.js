import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    hmr: false
  },
  resolve: {
    alias: {
      'claygl/shaders': path.resolve(__dirname, '../src/shader/exports.ts'),
      claygl: path.resolve(__dirname, '../src/claygl.ts')
    }
  }
});
