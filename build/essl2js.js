var glob = require('glob');
var fs = require('fs');

var ROOT = __dirname + '/../src/';

glob(ROOT + '**/*.essl', function (err, files) {
    files.forEach(function (filePath) {
        var esslCode = fs.readFileSync(filePath, 'utf-8');
        // TODO Remove comment
        // esslCode = esslCode.replace(/\/\/.*\n/g, '');
        // esslCode = esslCode.replace(/ +/g, ' ');
        
        //From THREE.js's rollup.config.js
        esslCode = esslCode
            .replace( /[ \t]*\/\/.*\n/g, '' ) // remove //
            .replace( /[ \t]*\/\*[\s\S]*?\*\//g, '' ) // remove /* */
            .replace( /\n{2,}/g, '\n' ) // # \n+ to \n

        // var dir = path.dirname(filePath);
        // var baseName = path.basename(filePath, '.essl');
        fs.writeFileSync(
            filePath + '.js',
            'export default ' +
               JSON.stringify(esslCode) + ';\n',
            'utf-8'
        );
    });
});