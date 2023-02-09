import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

var filename = fileURLToPath(import.meta.url);
var dirname = path.dirname(filename);

export default defineConfig({
  server: {
    hmr: false
  },
  build: {
    rollupOptions: {
      input: {
        triangle_customshader: path.resolve(dirname, './triangle_customshader.html')
      }
    }
  },
  resolve: {
    alias: {
      'claygl/shaders': path.resolve(dirname, '../src/shader/exports.ts'),
      claygl: path.resolve(dirname, '../src/claygl.ts')
    }
  }
});
