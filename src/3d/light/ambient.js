define(function(require) {

    var Light = require('../light'),
        Shader = require('../shader');

    var SHADER_STR = [ '@export buildin.header.ambient_light',
                        'uniform vec3 ambientLightColor[ AMBIENT_LIGHT_NUMBER ] : unconfigurable;',
                        '@end;' ].join('\n');

    Shader.import(SHADER_STR);

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