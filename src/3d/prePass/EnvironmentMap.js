define(function (require) {

    var Base = require('core/Base');
    var Vector3 = require('core/Vector3');
    var PerspectiveCamera = require('../camera/Perspective');
    var glenum = require("../glenum");
    var FrameBuffer = require("../FrameBuffer");
    var TextureCube = require("../texture/TextureCube");

    var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    var targetMap = {
        'px' : glenum.TEXTURE_CUBE_MAP_POSITIVE_X,
        'py' : glenum.TEXTURE_CUBE_MAP_POSITIVE_Y,
        'pz' : glenum.TEXTURE_CUBE_MAP_POSITIVE_Z,
        'nx' : glenum.TEXTURE_CUBE_MAP_NEGATIVE_X,
        'ny' : glenum.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        'nz' : glenum.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    }

    var EnvironmentMapPass = Base.derive(function() {
        var ret = {
            position : new Vector3(),
            far : 1000,
            near : 0.1,
            texture : null,
            frameBuffer : new FrameBuffer()
        }
        ret._cameras = {
            'px' : new PerspectiveCamera({fov : 90}),
            'nx' : new PerspectiveCamera({fov : 90}),
            'py' : new PerspectiveCamera({fov : 90}),
            'ny' : new PerspectiveCamera({fov : 90}),
            'pz' : new PerspectiveCamera({fov : 90}),
            'nz' : new PerspectiveCamera({fov : 90}),
        }
        ret._cameras.px.lookAt(Vector3.POSITIVE_X, Vector3.NEGATIVE_Y);
        ret._cameras.nx.lookAt(Vector3.NEGATIVE_X, Vector3.NEGATIVE_Y);
        ret._cameras.py.lookAt(Vector3.POSITIVE_Y, Vector3.POSITIVE_Z);
        ret._cameras.ny.lookAt(Vector3.NEGATIVE_Y, Vector3.NEGATIVE_Z);
        ret._cameras.pz.lookAt(Vector3.POSITIVE_Z, Vector3.NEGATIVE_Y);
        ret._cameras.nz.lookAt(Vector3.NEGATIVE_Z, Vector3.NEGATIVE_Y);

        return ret;
    }, {
        render : function(renderer, scene) {
            var _gl = renderer.gl;
            scene.autoUpdate = false;
            scene.update(true);
            // Tweak fov
            // http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
            var n = this.texture.width;
            var fov = 2 * Math.atan(n / (n - 0.5)) / Math.PI * 180;
            for (var i = 0; i < 6; i++) {
                var target = targets[i];
                var camera = this._cameras[target];
                camera.position.copy(this.position);
                camera.far = this.far;
                camera.near = this.near;
                camera.fov = fov;

                this.frameBuffer.attach(_gl, this.texture, _gl.COLOR_ATTACHMENT0, targetMap[target]);
                this.frameBuffer.bind(renderer);
                renderer.render(scene, camera);
                this.frameBuffer.unbind(renderer);
            }
            scene.autoUpdate = true;
        },
        dispose : function(renderer) {
            this.frameBuffer.dispose(renderer._gl);
        }
    });

    return EnvironmentMapPass;
})