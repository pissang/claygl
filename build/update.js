var glob = require('glob');
var fs = require('fs');

var ROOT = "../src/";
var OUTPUT_PORTAL = "qtek.js";

var template = fs.readFileSync("qtek_template.js", "utf-8")

glob("**/*.js", {
    cwd : ROOT
}, function(err, files){

    var namespace = {};

    files.forEach(function(file){
        if( file.match(/qtek.*?\.js/) || file === "text.js"){
            return;
        }
        var filePathWithOutExt = file.slice(0, -3);
        var pathArray = filePathWithOutExt.split("/");
        var baseName = pathArray.pop();

        var object = pathArray.reduce(function(memo, propName){
            if( ! memo[propName] ){
                memo[propName] = {};
            }
            return memo[propName];
        }, namespace);
        
        object[baseName] = "__require('qtek/"+filePathWithOutExt+"')__";
    })

    var jsString = JSON.stringify( namespace, null, '\t' );
    jsString = jsString.replace(/\"\__require\((\S*?)\)__\"/g, 'require($1)')

    var output = template.replace(/\{\{\$exportsObject\}\}/, jsString);

    fs.writeFileSync( ROOT+OUTPUT_PORTAL, output, "utf-8");
});