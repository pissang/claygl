define(function(require) {

    var Camera = require('../Camera');

    var Perspective = Camera.derive(function() {
        return {

            fov : 50,
            
            aspect : 1,
            
            near : 0.1,
            
            far : 2000
        }
    }, {
        
        updateProjectionMatrix : function() {
            var rad = this.fov / 180 * Math.PI;
            this.projectionMatrix.perspective(rad, this.aspect, this.near, this.far);
        }
    });

    return Perspective;
} )