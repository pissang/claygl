define( function(require){

	var Camera = require('../camera'),
		glMatrix = require('glmatrix'),
		mat4 = glMatrix.mat4;


	var Perspective = Camera.derive( function(){
		return {

			fov : 50,
			
			aspect : 1,
			
			near : 0.1,
			
			far : 2000
		}
	}, {
		
		updateProjectionMatrix : function(){
			var rad = this.fov / 180 * Math.PI;
			mat4.perspective( this.projectionMatrix, rad, this.aspect, this.near, this.far );
		}
	});

	return Perspective;
} )