import Renderable from './Renderable';
import glenum from './core/glenum';
import Texture2D from './Texture2D';

/**
 * @constructor clay.Mesh
 * @extends clay.Renderable
 */
var Mesh = Renderable.extend(
/** @lends clay.Mesh# */
{
    /**
     * Used when it is a skinned mesh
     * @type {clay.Skeleton}
     */
    skeleton: null,
    /**
     * Joints indices Meshes can share the one skeleton instance and each mesh can use one part of joints. Joints indices indicate the index of joint in the skeleton instance
     * @type {number[]}
     */
    joints: null,

    /**
     * If store the skin matrices in vertex texture
     * @type {bool}
     */
    useSkinMatricesTexture: false

}, function () {
    if (!this.joints) {
        this.joints = [];
    }
}, {

    isSkinnedMesh: function () {
        return !!(this.skeleton && this.joints && this.joints.length > 0);
    },

    render: function (renderer, shader, program) {
        var _gl = renderer.gl;
        // Set pose matrices of skinned mesh
        if (this.skeleton) {
            // TODO Multiple mesh share same skeleton
            this.skeleton.update();

            var skinMatricesArray = this.skeleton.getSubSkinMatrices(this.__uid__, this.joints);

            // if (this.useSkinMatricesTexture) {
            //     var size;
            //     var numJoints = this.joints.length;
            //     if (numJoints > 256) {
            //         size = 64;
            //     }
            //     else if (numJoints > 64) {
            //         size = 32;
            //     }
            //     else if (numJoints > 16) {
            //         size = 16;
            //     }
            //     else {
            //         size = 8;
            //     }

            //     var texture = this.getSkinMatricesTexture();
            //     texture.width = size;
            //     texture.height = size;

            //     if (!texture.pixels || texture.pixels.length !== size * size * 4) {
            //         texture.pixels = new Float32Array(size * size * 4);
            //     }
            //     texture.pixels.set(skinMatricesArray);
            //     texture.dirty();

            //     shader.setUniform(_gl, '1f', 'skinMatricesTextureSize', size);
            // }
            // else {
            program.setUniformOfSemantic(_gl, 'SKIN_MATRIX', skinMatricesArray);
            // }
        }

        return Renderable.prototype.render.call(this, renderer, shader, program);
    },

    getSkinMatricesTexture: function () {
        this._skinMatricesTexture = this._skinMatricesTexture || new Texture2D({
            type: glenum.FLOAT,
            minFilter: glenum.NEAREST,
            magFilter: glenum.NEAREST,
            useMipmap: false,
            flipY: false
        });

        return this._skinMatricesTexture;
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
