define(function(require) {

    var Mesh = require('../mesh');
    var SphereGeometry = require('../geometry/sphere');
    var Shader = require('../shader');
    var Material = require('../material');
    var shaderLibrary = require('../shader/library');

    var skydomeShader = new Shader({
        vertex : Shader.source("buildin.basic.vertex"),
        fragment : Shader.source("buildin.basic.fragment")
    });
    skydomeShader.enableTexture("diffuseMap");

    var Skydome = Mesh.derive(function() {

        var material = new Material({
            shader : skydomeShader,
            depthMask : false
        });
        
        return {
            geometry : new SphereGeometry({
                widthSegments : 50,
                heightSegments : 50,
                // thetaLength : Math.PI / 2
            }),
            material : material,

            renderer : null,
            camera : null
        }
    }, function() {
        var skydome = this;
        var camera = this.camera;
        var renderer = this.renderer;
        if (renderer) {
            renderer.on("beforerender:opaque", function() {
                this.renderQueue([skydome], camera, null, true);
            });
        }
        if (camera) {
            camera.on("afterupdate", function() {
                skydome.position.copy(this.getWorldPosition());
                skydome.update();
            });
        }
    });

    return Skydome;
});