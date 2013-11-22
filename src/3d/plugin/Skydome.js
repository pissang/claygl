define(function(require) {

    var Mesh = require('../Mesh');
    var SphereGeometry = require('../geometry/Sphere');
    var Shader = require('../Shader');
    var Material = require('../Material');
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
                widthSegments : 30,
                heightSegments : 30,
                // thetaLength : Math.PI / 2
            }),
            material : material,

            renderer : null,
            camera : null,

            _beforeRenderOpaque : function(renderer, opaque) {
                renderer.renderQueue([this], this.camera, null, true);
            },

            _afterUpdateCamera : function(camera) {
                this.position.copy(camera.getWorldPosition());
                this.update();
            }
        }
    }, function() {
        var camera = this.camera;
        var renderer = this.renderer;
        if (renderer) {
            this.attachRenderer(renderer);
        }
        if (camera) {
            this.attachCamera(camera);
        }
    }, {
        attachRenderer : function(renderer) {
            renderer.on("beforerender:opaque", this._beforeRenderOpaque, this);
        },

        detachRenderer : function(renderer) {
            renderer.off("beforerender:opaque", this._beforeRenderOpaque, this);  
        },

        attachCamera : function(camera) {
            camera.on('afterupdate', this._afterUpdateCamera, this);
        },

        detachCamera : function(camera) {
            camera.off('afterupdate', this._afterUpdateCamera, this);
        }
    });

    return Skydome;
});