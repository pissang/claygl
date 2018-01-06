import Camera from '../Camera';
/**
 * @constructor clay.camera.Orthographic
 * @extends clay.Camera
 */
var Orthographic = Camera.extend(
/** @lends clay.camera.Orthographic# */
{
    /**
     * @type {number}
     */
    left: -1,
    /**
     * @type {number}
     */
    right: 1,
    /**
     * @type {number}
     */
    near: -1,
    /**
     * @type {number}
     */
    far: 1,
    /**
     * @type {number}
     */
    top: 1,
    /**
     * @type {number}
     */
    bottom: -1
},
/** @lends clay.camera.Orthographic.prototype */
{

    updateProjectionMatrix: function() {
        this.projectionMatrix.ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
    },

    decomposeProjectionMatrix: function () {
        var m = this.projectionMatrix.array;
        this.left = (-1 - m[12]) / m[0];
        this.right = (1 - m[12]) / m[0];
        this.top = (1 - m[13]) / m[5];
        this.bottom = (-1 - m[13]) / m[5];
        this.near = -(-1 - m[14]) / m[10];
        this.far = -(1 - m[14]) / m[10];
    },
    /**
     * @return {clay.camera.Orthographic}
     */
    clone: function() {
        var camera = Camera.prototype.clone.call(this);
        camera.left = this.left;
        camera.right = this.right;
        camera.near = this.near;
        camera.far = this.far;
        camera.top = this.top;
        camera.bottom = this.bottom;

        return camera;
    }
});

export default Orthographic;
