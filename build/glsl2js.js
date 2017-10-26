var glob = require('glob');
var fs = require('fs');

var ROOT = __dirname + '/../src/';

glob(ROOT + '**/*.glsl', function (err, files) {
    files.forEach(function (filePath) {
        var glslCode = fs.readFileSync(filePath, 'utf-8');
        
        //From THREE.js's rollup.config.js
        glslCode = glslCode
            .replace( /\r/g, '' ) // remove \r
            .replace( /[ \t]*\/\/.*\n/g, '' ) // remove //
            .replace( /[ \t]*\/\*[\s\S]*?\*\//g, '' ) // remove /* */
            .replace( /\n{2,}/g, '\n' ) // # \n+ to \n

        // var dir = path.dirname(filePath);
        // var baseName = path.basename(filePath, '.essl');
        fs.writeFileSync(
            filePath + '.js',
            'export default ' +
               JSON.stringify(glslCode) + ';\n',
            'utf-8'
        );
    });
});