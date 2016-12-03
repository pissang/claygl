define(function(require) {

    'use strict';

    var Camera = require('../Camera');

    /**
     * @constructor qtek.camera.Perspective
     * @extends qtek.Camera
     */
    var Perspective = Camera.extend(
    /** @lends qtek.camera.Perspective# */
    {
        /**
         * Vertical field of view in radians
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
    /** @lends qtek.camera.Perspective.prototype */
    {

        updateProjectionMatrix: function() {
            var rad = this.fov / 180 * Math.PI;
            this.projectionMatrix.perspective(rad, this.aspect, this.near, this.far);
        },
        /**
         * @return {qtek.camera.Perspective}
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

    return Perspective;
});