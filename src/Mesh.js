define(function(require) {

    'use strict';

    var Renderable = require('./Renderable');
    var glenum = require('./core/glenum');

    /**
     * @constructor qtek.Mesh
     * @extends qtek.Renderable
     */
    var Mesh = Renderable.derive(
    /** @lends qtek.Mesh# */
    {
        /**
         * Used when it is a skinned mesh
         * @type {qtek.Skeleton}
         */
        skeleton: null,
        /**
         * Joints indices Meshes can share the one skeleton instance and each mesh can use one part of joints. Joints indices indicate the index of joint in the skeleton instance
         * @type {number[]}
         */
        joints: null

    }, function() {
        if (!this.joints) {
            this.joints = [];
        }
    }, {
        render: function(_gl, globalMaterial) {       
            var material = globalMaterial || this.material;
            // Set pose matrices of skinned mesh
            if (this.skeleton) {
                var skinMatricesArray = this.skeleton.getSubSkinMatrices(this.__GUID__, this.joints);
                material.shader.setUniformBySemantic(_gl, 'SKIN_MATRIX', skinMatricesArray);
            }

            return Renderable.prototype.render.call(this, _gl, globalMaterial);
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

    return Mesh;
});