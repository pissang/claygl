import commonjs from 'rollup-plugin-commonjs';

function essl() {
    
        return {
    
            transform( code, id ) {
    
                if ( /\.essl$/.test( id ) === false ) return;
    
                var transformedCode = 'export default ' + JSON.stringify(
                    code
                        .replace( /[ \t]*\/\/.*\n/g, '' ) // remove //
                        .replace( /[ \t]*\/\*[\s\S]*?\*\//g, '' ) // remove /* */
                        .replace( /\n{2,}/g, '\n' ) // # \n+ to \n
                ) + ';';
                return {
                    code: transformedCode,
                    map: { mappings: '' }
                };
    
            }
    
        };
    
    }
    
    export default {
        input: 'src/qtek.js',
        plugins: [
            essl(),
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