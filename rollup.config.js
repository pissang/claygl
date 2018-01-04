import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'src/claygl.js',
    plugins: [
        commonjs({
            include: 'src/dep/*',
        })
    ],
    // sourceMap: true,
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