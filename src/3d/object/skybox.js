define(function(require) {

    var Mesh = require('../mesh');
    var CubeGeometry = require('../geometry/cube');
    var Shader = require('../shader');
    var Material = require('../material');
    var shaderLibrary = require('../shader/library');

    var skyboxShader = shaderLibrary.get("buildin.skybox", "environmentMap");

    var Skybox = Mesh.derive(function() {

        var material = new Material({
            shader : skyboxShader,
            depthWrite : false
        });
        
        return {
            geometry : new CubeGeometry(),
            material : material
        }
    }, {
    });

    return Skybox;
});