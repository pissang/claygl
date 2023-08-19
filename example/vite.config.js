import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import glslMinifyPlugin from '../build/glslMinifyPlugin';

var filename = fileURLToPath(import.meta.url);
var dirname = path.dirname(filename);

export default defineConfig({
  server: {
    hmr: false,
    port: 3002
  },
  build: {
    rollupOptions: {
      input: {
        triangle_customshader: path.resolve(dirname, './triangle_customshader.html')
      },
      plugins: [glslMinifyPlugin()]
    }
  },
  resolve: {
    alias: {
      'claygl/shaders': path.resolve(dirname, '../src/shader/exports.ts'),
      claygl: path.resolve(dirname, '../src/claygl.ts')
    }
  }
});
