module.exports = function(grunt){

    function makeRequirejsConfig(special) {
        var common = {
            'baseUrl' : './src',
            'paths' : {
                '_' : '../thirdparty/lodash.compat',
                'glmatrix' : '../thirdparty/gl-matrix'
            },
            // 'exclude' : ['glmatrix', '_'],
            'name' : '../build/almond',
            'include' : [ "qtek"],
                        
            'out':"dist/qtek.js",
            'wrap' : {
                'startFile' : 'build/wrap/start.js',
                'endFile' : 'build/wrap/end.js'
            },
            'optimize':"none"   
        }

        if( special === "webgl"){
            common["include"] = ["qtek3d"];
            common["out"] = "dist/qtek.webgl.js";
        }else if( special === "canvas" ){
            common["include"] = ["qtek2d"];
            common["out"] = "dist/qtek.canvas.js";
        }else if( special === "image"){
            common["include"] = ["qtekimage"];
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