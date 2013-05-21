define( function(require){
	
	var exportsObject =  {{$exportsObject}};

    var glMatrix = require('glmatrix');
    exportsObject.math = glMatrix;
    
    return exportsObject;
})