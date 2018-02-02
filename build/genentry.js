var glob = require('glob');
var fs = require('fs');
var path = require('path');

var ROOT = __dirname + '/../';
var SRC_ROOT = ROOT + 'src/';
var TS_ROOT =  ROOT + 'typescript/';
var TS_PORTAL = 'index.d.ts';

var OUTPUT_PORTAL = 'claygl.js';

var template = fs.readFileSync(__dirname  + '/claygl_template.js', 'utf-8');

var idx = 0;
var blacklist = ['shader/builtin', 'app/', 'canvas/', 'gpu/'];

var topLevelClasses = [
    'math/BoundingBox',
    'math/Frustum',
    'math/Matrix2',
    'math/Matrix2d',
    'math/Matrix3',
    'math/Matrix4',
    'math/Plane',
    'math/Quaternion',
    'math/Ray',
    'math/Value',
    'math/Vector2',
    'math/Vector3',
    'math/Vector4'
]

glob('**/*.js', {
    cwd : SRC_ROOT
}, function(err, files){

    var namespace = {};

    var tsReferenceList = [];

    files.forEach(function(file){
        if (
            file.match(/claygl.*?\.js/)
            || file.indexOf('_') >= 0
            || file.endsWith('.glsl.js')
        ) {
            return;
        }
        var filePathWithOutExt = file.slice(0, -3);
        if (blacklist.indexOf(filePathWithOutExt) >= 0) {
            return;
        }
        var pathArray = filePathWithOutExt.split('/');
        var baseName = pathArray.pop() + '$' + idx++;

        var object = pathArray.reduce(function(memo, propName){
            if(!memo[propName] ){
                memo[propName] = {};
            }
            return memo[propName];
        }, namespace);

        object[baseName] = `import ${baseName} from './${filePathWithOutExt}';`;

        var tsPath = TS_ROOT + filePathWithOutExt + '.d.ts';

        if (fs.existsSync(tsPath)) {
            tsReferenceList.push(filePathWithOutExt);
        }
    });

    var exportCode = exportPkg(namespace);
    var output = template.replace(/\{\{\$exportsObject\}\}/, exportCode);

    fs.writeFileSync(SRC_ROOT + OUTPUT_PORTAL, output, 'utf-8');

    // Write to ts reference file
    // var referenceCode = tsReferenceList.map(function(path) {
    //     return '///<reference path="typescript/' + path + '" />';
    // }).join('\n');
    // fs.writeFileSync(ROOT + TS_PORTAL, referenceCode, 'utf-8');
});

/**
 * Export pkg to import/export codes
 * @param {Object} pkg package to export
 * @param {Boolean} isChild if it is a child package
 * @param {String} pkgName name of the package, if it's a child
 * @param {String[]} externImports imports
 */
function exportPkg(pkg, isChild, pkgName, externImports) {
    var keys = Object.keys(pkg);
    var imports = externImports || [];

    var topLevels = [];
    var children = keys.map(function (name) {
        if (isString(pkg[name])) {
            var className = name.substring(0, name.indexOf('$'));
            if (topLevelClasses.find(function (item) {
                return pkg[name].indexOf(item) >= 0;
            })) {
                topLevels.push(name);
            }
            // a class, not a packagge
            imports.push(pkg[name]);
            if (pkgName) {
                // export as a child class in package
                // indentation + (key : value)
                return (isChild ? '        '  : '    ') + className + ' : ' + name;
            }
            else {
                // export as a class at root level
                return `export { ${name} as ${className} };`;
            }
        }
        else {
            // export as a child package
            return exportPkg(pkg[name], pkgName && true, name, imports);
        }
    });

    var importCode = (externImports ? '' : imports.join('\n') + '\n\n');
    var exportCode;
    if (pkgName) {
        if (isChild) {
            // export as a grand-child package
            exportCode = `    ${pkgName} : {\n${children.join(',\n')}\n    }`;
        }
        else {
            // export as a package at root level
            exportCode = `\nvar ${pkgName} = {\n${children.join(',\n')}\n};\nexport { ${pkgName} };\n`;
        }
    }
    else {
        // export child classes
        exportCode = children.join('\n');
    }

    topLevels.forEach(function (name) {
        var className = name.substring(0, name.indexOf('$'));
        exportCode += `export { ${name} as ${className} };\n`;
    });

    return importCode  + exportCode;
}

function isString(s) {
    return typeof s === 'string';
}
