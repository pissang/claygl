define( function(require){

    var Camera = require('../camera'),
        glMatrix = require('glmatrix'),
        mat4 = glMatrix.mat4;

    var Orthographic = Camera.derive( function(){
        return {

            left : -1,
            right : 1,
            near : 0,
            far : 1,
            top : 1,
            bottom : -1,
        }
    }, {
        
        updateProjectionMatrix : function(){
            mat4.ortho( this.projectionMatrix, this.left, this.right, this.bottom, this.top, this.near, this.far );
        }
    });

    return Orthographic;
} )