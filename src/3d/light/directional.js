define( function(require){

    var Light = require('../light');
    var Shader = require('../shader');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var SHADER_STR = [ '@export buildin.header.directional_light',
                        'uniform vec3 directionalLightDirection[ DIRECTIONAL_LIGHT_NUMBER ];',
                        'uniform vec3 directionalLightColor[ DIRECTIONAL_LIGHT_NUMBER ];',
                        '@end;' ].join('\n');

    Shader.import(SHADER_STR);

    var DirectionalLight = Light.derive( function(){

        return {
            // Config of orthographic camera for shadow mapping generate
            shadowCamera : {
                left : -20,
                right : 20,
                top : 20,
                bottom : -20,
                near : 0,
                far : 100
            }
        }
    }, {

        type : 'DIRECTIONAL_LIGHT',

        uniformTemplates : {
            'directionalLightDirection' : {
                type : '3f',
                value : ( function(){
                    var z = vec3.create(),
                        m;
                    return function( instance ){
                        m = instance.worldMatrix;
                        vec3.set( z, m[8], m[9], m[10] );
                        return z;
                    }
                })()
            },
            'directionalLightColor' : {
                type : '3f',
                value : function( instance ){
                    var color = instance.color,
                        intensity = instance.intensity;
                    return [ color[0]*intensity, color[1]*intensity, color[1]*intensity ];
                }
            }
        }
    })

    return DirectionalLight;
} )