import Renderable from './Renderable';
import glenum from './core/glenum';

/**
 * @constructor clay.Mesh
 * @extends clay.Renderable
 */
var Mesh = Renderable.extend(/** @lends clay.Mesh# */ {
    /**
     * Used when it is a skinned mesh
     * @type {clay.Skeleton}
     */
    skeleton: null,
    /**
     * Joints indices Meshes can share the one skeleton instance and each mesh can use one part of joints. Joints indices indicate the index of joint in the skeleton instance
     * @type {number[]}
     */
    joints: null

}, function () {
    if (!this.joints) {
        this.joints = [];
    }
}, {

    /**
     * Offset matrix used for multiple skinned mesh clone sharing one skeleton
     * @type {clay.Matrix4}
     */
    offsetMatrix: null,

    isInstancedMesh: function () { return false; },

    isSkinnedMesh: function () {
        return !!(this.skeleton && this.joints && this.joints.length > 0);
    },

    clone: function () {
        var mesh = Renderable.prototype.clone.call(this);
        mesh.skeleton = this.skeleton;
        if (this.joints) {
            mesh.joints = this.joints.slice();
        }
        return mesh;
    }
});

// Enums
Mesh.POINTS = glenum.POINTS;
Mesh.LINES = glenum.LINES;
Mesh.LINE_LOOP = glenum.LINE_LOOP;
Mesh.LINE_STRIP = glenum.LINE_STRIP;
Mesh.TRIANGLES = glenum.TRIANGLES;
Mesh.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
Mesh.TRIANGLE_FAN = glenum.TRIANGLE_FAN;

Mesh.BACK = glenum.BACK;
Mesh.FRONT = glenum.FRONT;
Mesh.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
Mesh.CW = glenum.CW;
Mesh.CCW = glenum.CCW;

export default Mesh;
