define(function (require) {

    var Base = require('../core/Base');
    var Vector3 = require('../math/Vector3');
    var PerspectiveCamera = require('../camera/Perspective');
    var glenum = require('../core/glenum');
    var FrameBuffer = require('../FrameBuffer');
    var TextureCube = require('../TextureCube');

    var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

    /**
     * Pass rendering scene to a environment cube map
     * 
     * @constructor qtek.prePass.EnvironmentMap
     * @extends qtek.core.Base
     * @example
     *     // Example of car reflection
     *     var envMap = new qtek.TextureCube({
     *         width: 256,
     *         height: 256
     *     });
     *     var envPass = new qtek.prePass.EnvironmentMap({
     *         position: car.position,
     *         texture: envMap
     *     });
     *     var carBody = car.getChildByName('body');
     *     carBody.material.shader.enableTexture('environmentMap');
     *     carBody.material.set('environmentMap', envMap);
     *     ...
     *     animation.on('frame', function(frameTime) {
     *         envPass.render(renderer, scene);
     *         renderer.render(scene, camera);
     *     });
     */
    var EnvironmentMapPass = Base.derive(function() {
        var ret = {
            /**
             * Camera position
             * @type {qtek.math.Vector3}
             * @memberOf qtek.prePass.EnvironmentMap#
             */
            position: new Vector3(),
            /**
             * Camera far plane
             * @type {number}
             * @memberOf qtek.prePass.EnvironmentMap#
             */
            far: 1000,
            /**
             * Camera near plane
             * @type {number}
             * @memberOf qtek.prePass.EnvironmentMap#
             */
            near: 0.1,
            /**
             * Environment cube map
             * @type {qtek.TextureCube}
             * @memberOf qtek.prePass.EnvironmentMap#
             */
            texture: null

            // frameBuffer: new FrameBuffer()
        };
        ret._cameras = {
            px: new PerspectiveCamera({fov: 90}),
            nx: new PerspectiveCamera({fov: 90}),
            py: new PerspectiveCamera({fov: 90}),
            ny: new PerspectiveCamera({fov: 90}),
            pz: new PerspectiveCamera({fov: 90}),
            nz: new PerspectiveCamera({fov: 90})
        };
        ret._cameras.px.lookAt(Vector3.POSITIVE_X, Vector3.NEGATIVE_Y);
        ret._cameras.nx.lookAt(Vector3.NEGATIVE_X, Vector3.NEGATIVE_Y);
        ret._cameras.py.lookAt(Vector3.POSITIVE_Y, Vector3.POSITIVE_Z);
        ret._cameras.ny.lookAt(Vector3.NEGATIVE_Y, Vector3.NEGATIVE_Z);
        ret._cameras.pz.lookAt(Vector3.POSITIVE_Z, Vector3.NEGATIVE_Y);
        ret._cameras.nz.lookAt(Vector3.NEGATIVE_Z, Vector3.NEGATIVE_Y);

        // FIXME In windows, use one framebuffer only renders one side of cubemap
        ret._frameBuffers = {
            px: new FrameBuffer(),
            nx: new FrameBuffer(),
            py: new FrameBuffer(),
            ny: new FrameBuffer(),
            pz: new FrameBuffer(),
            nz: new FrameBuffer()
        };

        return ret;
    }, {
        /**
         * @param  {qtek.Renderer} renderer
         * @param  {qtek.Scene} scene
         * @param  {boolean} [notUpdateScene=false]
         */
        render: function(renderer, scene, notUpdateScene) {
            var _gl = renderer.gl;
            if (!notUpdateScene) {
                scene.update(true);
            }
            // Tweak fov
            // http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
            var n = this.texture.width;
            var fov = 2 * Math.atan(n / (n - 0.5)) / Math.PI * 180;
            for (var i = 0; i < 6; i++) {
                var target = targets[i];
                var camera = this._cameras[target];
                Vector3.copy(camera.position, this.position);
                camera.far = this.far;
                camera.near = this.near;
                camera.fov = fov;

                this._frameBuffers[target].attach(
                    _gl, this.texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i
                );
                this._frameBuffers[target].bind(renderer);
                renderer.render(scene, camera, true);
                this._frameBuffers[target].unbind(renderer);
            }
        },
        /**
         * @param  {qtek.Renderer} renderer
         */
        dispose: function(renderer) {
            // this.frameBuffer.dispose(renderer.gl);
            for (var i = 0; i < 6; i++) {
                var target = targets[i];
                this._frameBuffers[target].dispose(renderer.gl);
            }
        }
    });

    return EnvironmentMapPass;
});