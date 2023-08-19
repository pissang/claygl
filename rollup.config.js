import typescript from '@rollup/plugin-typescript';
import glslMinifyPlugin from './build/glslMinifyPlugin';

export default {
  input: 'src/claygl.ts',
  plugins: [
    typescript({
      target: 'ES5'
    }),
    glslMinifyPlugin()
  ],
  output: [
    {
      format: 'umd',
      name: 'clay',
      sourcemap: true,
      file: 'dist/claygl.js'
    },
    {
      format: 'es',
      sourcemap: true,
      file: 'dist/claygl.es.js'
    }
  ]
};
