define( function(require){

    var Node = require("./node");
    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var Camera = Node.derive(function() {
        return {
            projectionMatrix : mat4.create(),
        }
    }, function(){
        this.update();
    }, {
        
        update : function( _gl ) {

            Node.prototype.update.call( this, _gl );
            
            this.updateProjectionMatrix();
        },

        lookAt : ( function() {
            var lookAtMat4 = mat4.create();
            return function( target ){
                mat4.lookAt( lookAtMat4, this.position, target, this.up );
                
                this.updateFromLookAtMatrix( lookAtMat4 );
            }
        } )()
    });

    return Camera;
} )