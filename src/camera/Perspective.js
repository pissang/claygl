define(function(require) {

    var Camera = require('../Camera');

    var Perspective = Camera.derive({
        fov : 50,
        
        aspect : 1,
        
        near : 0.1,

        far : 2000
    }, {
        
        updateProjectionMatrix : function() {
            var rad = this.fov / 180 * Math.PI;
            this.projectionMatrix.perspective(rad, this.aspect, this.near, this.far);
        },

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
} )