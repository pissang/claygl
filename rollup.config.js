import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/claygl.ts',
  plugins: [typescript()],
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
