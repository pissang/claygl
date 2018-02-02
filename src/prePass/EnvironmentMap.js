import Base from '../core/Base';
import Vector3 from '../math/Vector3';
import PerspectiveCamera from '../camera/Perspective';
import FrameBuffer from '../FrameBuffer';

var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

/**
 * Pass rendering scene to a environment cube map
 *
 * @constructor clay.prePass.EnvironmentMap
 * @extends clay.core.Base
 * @example
 *     // Example of car reflection
 *     var envMap = new clay.TextureCube({
 *         width: 256,
 *         height: 256
 *     });
 *     var envPass = new clay.prePass.EnvironmentMap({
 *         position: car.position,
 *         texture: envMap
 *     });
 *     var carBody = car.getChildByName('body');
 *     carBody.material.enableTexture('environmentMap');
 *     carBody.material.set('environmentMap', envMap);
 *     ...
 *     animation.on('frame', function(frameTime) {
 *         envPass.render(renderer, scene);
 *         renderer.render(scene, camera);
 *     });
 */
var EnvironmentMapPass = Base.extend(function() {
    var ret = /** @lends clay.prePass.EnvironmentMap# */ {
        /**
         * Camera position
         * @type {clay.Vector3}
         * @memberOf clay.prePass.EnvironmentMap#
         */
        position: new Vector3(),
        /**
         * Camera far plane
         * @type {number}
         * @memberOf clay.prePass.EnvironmentMap#
         */
        far: 1000,
        /**
         * Camera near plane
         * @type {number}
         * @memberOf clay.prePass.EnvironmentMap#
         */
        near: 0.1,
        /**
         * Environment cube map
         * @type {clay.TextureCube}
         * @memberOf clay.prePass.EnvironmentMap#
         */
        texture: null,

        /**
         * Used if you wan't have shadow in environment map
         * @type {clay.prePass.ShadowMap}
         */
        shadowMapPass: null,
    };
    var cameras = ret._cameras = {
        px: new PerspectiveCamera({ fov: 90 }),
        nx: new PerspectiveCamera({ fov: 90 }),
        py: new PerspectiveCamera({ fov: 90 }),
        ny: new PerspectiveCamera({ fov: 90 }),
        pz: new PerspectiveCamera({ fov: 90 }),
        nz: new PerspectiveCamera({ fov: 90 })
    };
    cameras.px.lookAt(Vector3.POSITIVE_X, Vector3.NEGATIVE_Y);
    cameras.nx.lookAt(Vector3.NEGATIVE_X, Vector3.NEGATIVE_Y);
    cameras.py.lookAt(Vector3.POSITIVE_Y, Vector3.POSITIVE_Z);
    cameras.ny.lookAt(Vector3.NEGATIVE_Y, Vector3.NEGATIVE_Z);
    cameras.pz.lookAt(Vector3.POSITIVE_Z, Vector3.NEGATIVE_Y);
    cameras.nz.lookAt(Vector3.NEGATIVE_Z, Vector3.NEGATIVE_Y);

    // FIXME In windows, use one framebuffer only renders one side of cubemap
    ret._frameBuffer = new FrameBuffer();

    return ret;
},  /** @lends clay.prePass.EnvironmentMap# */ {
    /**
     * @param  {string} target
     * @return  {clay.Camera}
     */
    getCamera: function (target) {
        return this._cameras[target];
    },
    /**
     * @param  {clay.Renderer} renderer
     * @param  {clay.Scene} scene
     * @param  {boolean} [notUpdateScene=false]
     */
    render: function(renderer, scene, notUpdateScene) {
        var _gl = renderer.gl;
        if (!notUpdateScene) {
            scene.update();
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

            if (this.shadowMapPass) {
                camera.update();

                // update boundingBoxLastFrame
                var bbox = scene.getBoundingBox();
                bbox.applyTransform(camera.viewMatrix);
                scene.viewBoundingBoxLastFrame.copy(bbox);

                this.shadowMapPass.render(renderer, scene, camera, true);
            }
            this._frameBuffer.attach(
                this.texture, _gl.COLOR_ATTACHMENT0,
                _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i
            );
            this._frameBuffer.bind(renderer);
            renderer.render(scene, camera, true);
            this._frameBuffer.unbind(renderer);
        }
    },
    /**
     * @param {clay.Renderer} renderer
     */
    dispose: function (renderer) {
        this._frameBuffer.dispose(renderer);
    }
});

export default EnvironmentMapPass;
