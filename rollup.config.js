import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'src/qtek.js',
    plugins: [
        commonjs({
            include: 'src/dep/*',
        })
    ],
    // sourceMap: true,
    output: [
        {
            format: 'umd',
            name: 'qtek',
            file: 'dist/qtek.js'
        },
        {
            format: 'es',
            file: 'dist/qtek.es.js'
        }
    ]
};