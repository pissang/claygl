var glob = require('glob');
var fs = require('fs');

var ROOT = __dirname + '/../src/';

glob(ROOT + '**/*.essl', function (err, files) {
    files.forEach(function (filePath) {
        var esslCode = fs.readFileSync(filePath, 'utf-8');
        // TODO Remove comment
        esslCode = esslCode.replace(/\/\/.*\n/g, '');

        // var dir = path.dirname(filePath);
        // var baseName = path.basename(filePath, '.essl');
        fs.writeFileSync(
            filePath + '.js',
            'define(function () {\n' +
               'return ' + JSON.stringify(esslCode) + ';\n'
            + '});',
            'utf-8'
        );
    });
});