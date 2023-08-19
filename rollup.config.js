import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'lib/claygl.js',
  plugins: [nodeResolve()],
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
