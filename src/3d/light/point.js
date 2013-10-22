define(function(require) {

    var Light = require('../Light');
    var Shader = require('../Shader');

    var PointLight = Light.derive(function() {

        return {
            range : 100,

            castShadow : false,
        }
    }, {

        type : 'POINT_LIGHT',

        uniformTemplates : {
            'pointLightPosition' : {
                type : '3f',
                value : function(instance) {
                    return instance.getWorldPosition()._array;
                }
            },
            'pointLightRange' : {
                type : '1f',
                value : function(instance) {
                    return instance.range;
                }
            },
            'pointLightColor' : {
                type : '3f',
                value : function(instance) {
                    var color = instance.color,
                        intensity = instance.intensity;
                    return [ color[0]*intensity, color[1]*intensity, color[1]*intensity ];
                }
            }
        }
    })

    return PointLight;
})