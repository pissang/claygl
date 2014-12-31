define(function(require) {

    'use strict';

    var Camera = require('../Camera');
    /**
     * @constructor qtek.camera.Orthographic
     * @extends qtek.Camera
     */
    var Orthographic = Camera.derive(
    /** @lends qtek.camera.Orthographic# */
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
    /** @lends qtek.camera.Orthographic.prototype */
    {
        
        updateProjectionMatrix: function() {
            this.projectionMatrix.ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
        },
        /**
         * @return {qtek.camera.Orthographic}
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

    return Orthographic;
});