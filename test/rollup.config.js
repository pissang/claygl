import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'src/clay.js',
    plugins: [
        commonjs({
            include: 'src/dep/*',
        })
    ],
    // sourceMap: true,
    output: [
        {
            format: 'umd',
            name: 'claygl',
            file: 'dist/clay.src.js'
        }
    ]
};