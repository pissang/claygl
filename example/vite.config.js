import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    hmr: false
  },
  resolve: {
    alias: {
      claygl: path.resolve(__dirname, '../src/claygl.ts')
    }
  }
});
