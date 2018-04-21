import Camera from '../Camera';

/**
 * @constructor clay.camera.Perspective
 * @extends clay.Camera
 */
var Perspective = Camera.extend(/** @lends clay.camera.Perspective# */{
    /**
     * Vertical field of view in degrees
     * @type {number}
     */
    fov: 50,
    /**
     * Aspect ratio, typically viewport width / height
     * @type {number}
     */
    aspect: 1,
    /**
     * Near bound of the frustum
     * @type {number}
     */
    near: 0.1,
    /**
     * Far bound of the frustum
     * @type {number}
     */
    far: 2000
},
/** @lends clay.camera.Perspective.prototype */
{

    updateProjectionMatrix: function() {
        var rad = this.fov / 180 * Math.PI;
        this.projectionMatrix.perspective(rad, this.aspect, this.near, this.far);
    },
    decomposeProjectionMatrix: function () {
        var m = this.projectionMatrix.array;
        var rad = Math.atan(1 / m[5]) * 2;
        this.fov = rad / Math.PI * 180;
        this.aspect = m[5] / m[0];
        this.near = m[14] / (m[10] - 1);
        this.far = m[14] / (m[10] + 1);
    },
    /**
     * @return {clay.camera.Perspective}
     */
    clone: function() {
        var camera = Camera.prototype.clone.call(this);
        camera.fov = this.fov;
        camera.aspect = this.aspect;
        camera.near = this.near;
        camera.far = this.far;

        return camera;
    }
});

export default Perspective;
