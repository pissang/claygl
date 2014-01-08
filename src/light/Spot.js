define(function(require) {

    var Light = require('../Light');
    var Shader = require('../Shader');
    var Vector3 = require('../math/Vector3');

    var SpotLight = Light.derive(function() {

        return {
            range : 20,
            umbraAngle : 30,
            penumbraAngle : 45,
            falloffFactor : 2.0,
            
            shadowBias : 0.0002,
            shadowSlopeScale : 2.0
        }
    },{

        type : 'SPOT_LIGHT',

        uniformTemplates : {
            'spotLightPosition' : {
                type : '3f',
                value : function(instance) {
                    return instance.getWorldPosition()._array;
                }
            },
            'spotLightRange' : {
                type : '1f',
                value : function(instance) {
                    return instance.range;
                }
            },
            'spotLightUmbraAngleCosine' : {
                type : '1f',
                value : function(instance) {
                    return Math.cos(instance.umbraAngle * Math.PI / 180);
                }
            },
            'spotLightPenumbraAngleCosine' : {
                type : '1f',
                value : function(instance) {
                    return Math.cos(instance.penumbraAngle * Math.PI / 180);
                }
            },
            'spotLightFalloffFactor' : {
                type : '1f',
                value : function(instance) {
                    return instance.falloffFactor
                }
            },
            'spotLightDirection' : {
                type : '3f',
                value : (function() {
                    var z = new Vector3();
                    return function(instance) {
                        // Direction is target to eye
                        return z.copy(instance.worldTransform.forward).negate()._array;
                    }
                })()
            },
            'spotLightColor' : {
                type : '3f',
                value : function(instance) {
                    var color = instance.color,
                        intensity = instance.intensity;
                    return [ color[0]*intensity, color[1]*intensity, color[1]*intensity ];
                }
            }
        }
    })

    return SpotLight;
} )