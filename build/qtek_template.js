define( function(require){
	
	var exportsObject =  {{$exportsObject}};

    var glMatrix = require('glmatrix');
    exportsObject.glMatrix = glMatrix;
    
    return exportsObject;
})