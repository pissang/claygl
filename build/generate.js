var glob = require('glob');
    fs = require('fs');

var ROOT = "../src/",
    OUTPUT_PORTAL = "qtek.js";

var template = fs.readFileSync("qtek_template.js", "utf-8")

glob("**/*.js", {
    cwd : ROOT
}, function(err, files){

    var namespace = {};

    files.forEach(function(file){
        if( file.match(/qtek.*?\.js/) || file === "text.js"){
            return;
        }
        var fileNameWithOutExt = file.slice(0, -3);
        var pathArray = fileNameWithOutExt.split("/"),
            deepestKey = pathArray.pop();

        var object = pathArray.reduce(function(memo, propName){
            if( ! memo[propName] ){
                memo[propName] = {};
            }
            return memo[propName];
        }, namespace);
        
        var exportName = getExportName(file, deepestKey);
        
        object[exportName] = "__require('"+fileNameWithOutExt+"')__";
    })

    var jsString = JSON.stringify( namespace, null, '\t' );
    jsString = jsString.replace(/\"\__require\((\S*?)\)__\"/g, 'require($1)')

    var output = template.replace(/\{\{\$exportsObject\}\}/, jsString);

    fs.writeFileSync( ROOT+OUTPUT_PORTAL, output, "utf-8");
})

function getExportName(file, originName){
    var content = fs.readFileSync(ROOT+file, 'utf-8'),
        isClass = true, //default exports class
        exportName;
    content.replace(/\/\*[\s\S]*?@export\{(\S*?)\}\s*([a-zA-Z0-9]*)/, function(str, $1, $2){
        if( $1 === "object" ){
            isClass = false;
        }
        if( $2 && $2.replace(/\s*/, '') ){
            exportName = $2;
        }
    })
    if( isClass && ! exportName){
        // default class name
        exportName = originName[0].toUpperCase() + originName.slice(1);
    }
    return exportName || originName;
}