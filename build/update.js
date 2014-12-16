var glob = require('glob');
var fs = require('fs');

var ROOT = "../src/";
var OUTPUT_PORTAL = "qtek.js";

var TS_ROOT = "../typescript/";
var TS_PORTAL = "qtek.d.ts";

var template = fs.readFileSync("qtek_template.js", "utf-8");

var tsReferenceList = [];

glob("**/*.js", {
    cwd : ROOT
}, function(err, files){

    var namespace = {};

    files.forEach(function(file){
        if (file.match(/qtek.*?\.js/) || file === "text.js" || file.indexOf('_') >= 0) {
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
        
        object[baseName] = "__require('qtek/" + filePathWithOutExt + "')__";

        // Get typescript reference list
        var tsPath = TS_ROOT + filePathWithOutExt + ".d.ts";

        if (fs.existsSync(tsPath)) {
            tsReferenceList.push(filePathWithOutExt);
        }
    });

    var jsString = JSON.stringify( namespace, null, '\t' );
    jsString = jsString.replace(/\"\__require\((\S*?)\)__\"/g, 'require($1)')

    var output = template.replace(/\{\{\$exportsObject\}\}/, jsString);

    fs.writeFileSync(ROOT + OUTPUT_PORTAL, output, "utf-8");

    // Write to ts reference file
    var referenceCode = tsReferenceList.map(function(path) {
        return '///<reference path="' + path + '" />';
    }).join('\n');
    fs.writeFileSync(TS_ROOT + TS_PORTAL, referenceCode, "utf-8");
});