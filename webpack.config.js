var PROD = process.argv.indexOf('-p') >= 0;
var webpack = require('webpack');

module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            'typeof __DEV__': JSON.stringify('boolean'),
            __DEV__: PROD ? false : true
        })
    ],
    entry: {
        'qtek': __dirname + '/index.js'
    },
    output: {
        libraryTarget: 'umd',
        library: 'qtek',
        path: __dirname + '/dist',
        filename: PROD ? '[name].min.js' : '[name].js'
    }
};