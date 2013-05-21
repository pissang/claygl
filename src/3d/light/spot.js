define( function(require){

    var Light = require('../light');
    var Shader = require('../shader');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var SHADER_STR = [ '@export buildin.header.spot_light',
                        'uniform vec3 spotLightPosition[SPOT_LIGHT_NUMBER];',
                        'uniform vec3 spotLightDirection[SPOT_LIGHT_NUMBER];',
                        'uniform float spotLightRange[SPOT_LIGHT_NUMBER];',
                        'uniform float spotLightUmbraAngleCosine[SPOT_LIGHT_NUMBER];',
                        'uniform float spotLightPenumbraAngleCosine[SPOT_LIGHT_NUMBER];',
                        'uniform float spotLightFalloffFactor[SPOT_LIGHT_NUMBER];',
                        'uniform vec3 spotLightColor[SPOT_LIGHT_NUMBER];',
                        '@end;' ].join('\n');

    Shader.import(SHADER_STR);

    var SpotLight = Light.derive(function() {

        return {
            range : 20,
            umbraAngle : 30,
            penumbraAngle : 45,
            falloffFactor : 2.0
        }
    },{

        type : 'SPOT_LIGHT',

        uniformTemplates : {
            'spotLightPosition' : {
                type : '3f',
                value : function( instance ){
                    return instance.getWorldPosition();
                }
            },
            'spotLightRange' : {
                type : '1f',
                value : function( instance ){
                    return instance.range;
                }
            },
            'spotLightUmbraAngleCosine' : {
                type : '1f',
                value : function( instance ){
                    return Math.cos(instance.umbraAngle * Math.PI / 180);
                }
            },
            'spotLightPenumbraAngleCosine' : {
                type : '1f',
                value : function( instance ){
                    return Math.cos(instance.penumbraAngle * Math.PI / 180);
                }
            },
            'spotLightFalloffFactor' : {
                type : '1f',
                value : function( instance ){
                    return instance.falloffFactor
                }
            },
            'spotLightDirection' : {
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
            'spotLightColor' : {
                type : '3f',
                value : function( instance ){
                    var color = instance.color,
                        intensity = instance.intensity;
                    return [ color[0]*intensity, color[1]*intensity, color[1]*intensity ];
                }
            }
        }
    })

    return SpotLight;
} )