import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/claygl.ts',
  plugins: [typescript()],
  output: [
    {
      format: 'umd',
      name: 'clay',
      file: 'dist/claygl.js'
    },
    {
      format: 'es',
      file: 'dist/claygl.es.js'
    }
  ]
};
