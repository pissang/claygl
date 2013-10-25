define(function(require) {

    var Light = require('../Light');
    var Shader = require('../Shader');

    var AmbientLight = Light.derive(function() {
        return {
            castShadow : false
        }
    }, {

        type : 'AMBIENT_LIGHT',

        uniformTemplates : {
            'ambientLightColor' : {
                type : '3f',
                value : function(instance) {
                    var color = instance.color,
                        intensity = instance.intensity;
                    return [color[0]*intensity, color[1]*intensity, color[1]*intensity];
                }
            }
        }
    })

    return AmbientLight;
})