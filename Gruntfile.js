module.exports = function(grunt){

    function makeRequirejsConfig(special) {
        var common = {
            'baseUrl' : './src',
            'paths' : {
                '_' : '../thirdparty/lodash.min',
                'glmatrix' : '../thirdparty/gl-matrix-min'
            },
            'exclude' : ['text'],
            'name' : '../build/almond',
            'include' : ["qtek"],

            'out':"dist/qtek.js",
            'wrap' : {
                'startFile' : 'build/wrap/start.js',
                'endFile' : 'build/wrap/end.js'
            },
            'optimize':"none",
            'onBuildWrite' : function(moduleName, path, content){
                // Remove the text plugin convert to a normal module
                // Or the text plugin will have some problem when optimize the project based on qtek,
                // which also has a text plugin
                // https://groups.google.com/forum/?fromgroups#!msg/requirejs/jiaDogbA1EQ/jKrHL0gs21UJ
                // http://stackoverflow.com/questions/10196977/how-can-i-prevent-the-require-js-optimizer-from-including-the-text-plugin-in-opt
                content = content.replace(/define\([\'\"]text\!(.*?)[\'\"]/g, "define('$1'");
                // in dependencies
                content = content.replace(/define\((.*?)\[(.*?)\]/g, function(str, moduleId, dependencies){
                    dependencies = dependencies.split(",");
                    for(var i = 0; i < dependencies.length; i++){
                        if(dependencies[i]){
                            dependencies[i] = dependencies[i].replace(/[\'\"]text\!(.*?)[\'\"]/, "'$1'");
                        }
                    }
                    return "define(" + moduleId + "[" + dependencies.join(",") + "]";
                })
                content = content.replace(/require\([\'\"]text\!(.*?)[\'\"]\)/g, "require('$1')");
                return content;
            }
        }

        if( special === "webgl"){
            common["include"] = ["qtek3d"];
            common["wrap"]["endFile"] = "build/wrap/end.webgl.js";
            common["out"] = "dist/qtek.webgl.js";
        }else if( special === "canvas" ){
            common["include"] = ["qtek2d"];
            common["wrap"]["endFile"] = "build/wrap/end.canvas.js";
            common["out"] = "dist/qtek.canvas.js";
        }else if( special === "image"){
            common["include"] = ["qtekimage"];
            common["wrap"]["endFile"] = "build/wrap/end.image.js";
            common["out"] = "dist/qtek.image.js";
        }
        return common;
    }

    grunt.initConfig({
        jshint : {
            all : ["src/*.js"]
        },
        uglify : {
            all : {
                files : {
                    'dist/qtek.min.js' : ['dist/qtek.js']
                }
            },
            webgl : {
                files : {
                    'dist/qtek.webgl.min.js' : ['dist/qtek.webgl.js']
                }
            },
            canvas : {
                files : {
                    'dist/qtek.canvas.min.js' : ['dist/qtek.canvas.js']
                }
            },
            image : {
                files : {
                    'dist/qtek.image.min.js' : ['dist/qtek.image.js']
                }
            }
        },
        requirejs : {
            all : {
                options : makeRequirejsConfig()
            },
            webgl : {
                options : makeRequirejsConfig("webgl")
            },
            canvas : {
                options : makeRequirejsConfig("canvas")
            },
            image : {
                options : makeRequirejsConfig("image")
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['requirejs:all', 'uglify:all']);
    grunt.registerTask('webgl', ['requirejs:webgl', 'uglify:webgl']);
    grunt.registerTask('canvas', ['requirejs:canvas', 'uglify:canvas']);
    grunt.registerTask('image', ['requirejs:image', 'uglify:image']);
}