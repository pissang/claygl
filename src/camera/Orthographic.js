define(function(require) {

    var Camera = require('../Camera');

    var Orthographic = Camera.derive({
        left : -1,
        right : 1,
        near : -1,
        far : 1,
        top : 1,
        bottom : -1
    }, {
        
        updateProjectionMatrix : function() {
            this.projectionMatrix.ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
        },

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
} )