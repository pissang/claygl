
define( function(require){

    var Geometry = require('../geometry');
    var Plane = require('./plane');
    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;
    var _ = require('_');

    var planeMatrix = mat4.create();
    
    var Cube = Geometry.derive( function(){

        return {
            widthSegments : 1,
            heightSegments : 1,
            depthSegments : 1,
            // TODO double side material
            inside : false
        }
    }, function(){
        var planes = {
            "px" : createPlane("px", this.depthSegments, this.heightSegments),
            "nx" : createPlane("nx", this.depthSegments, this.heightSegments),
            "py" : createPlane("py", this.widthSegments, this.depthSegments),
            "ny" : createPlane("ny", this.widthSegments, this.depthSegments),
            "pz" : createPlane("pz", this.widthSegments, this.heightSegments),
            "nz" : createPlane("nz", this.widthSegments, this.heightSegments),
        };
        var cursor = 0;
        for( var pos in planes ){
            _.each(['position', 'texcoord0', 'normal'], function(attrName){
                var attrArray = planes[pos].attributes[attrName].value;
                for(var i = 0; i < attrArray.length; i++ ){
                    var value = attrArray[i];
                    if(this.inside && attrName === "normal"){
                        value[0] = -value[0];
                        value[1] = -value[1];
                        value[2] = -value[2];
                    }
                    this.attributes[attrName].value.push( value );
                }
                var plane = planes[pos];
                for(var i = 0; i < plane.faces.length; i++){
                    var face = plane.faces[i];
                    this.faces.push( [ face[0]+cursor, face[1]+cursor, face[2]+cursor ] );
                }
            }, this)
            cursor += planes[pos].getVerticesNumber();
        }
    })

    function createPlane( pos, widthSegments, heightSegments ){

        mat4.identity(planeMatrix);

        var plane = new Plane({
            widthSegments : widthSegments,
            heightSegments : heightSegments
        })

        switch( pos ){
            case "px":
                mat4.translate( planeMatrix, planeMatrix, [1, 0, 0] );
                mat4.rotateY( planeMatrix, planeMatrix, Math.PI/2 );
                break;
            case "nx":
                mat4.translate( planeMatrix, planeMatrix, [-1, 0, 0] );
                mat4.rotateY( planeMatrix, planeMatrix, -Math.PI/2 );
                break;
            case "py":
                mat4.translate( planeMatrix, planeMatrix, [0, 1, 0] );
                mat4.rotateX( planeMatrix, planeMatrix, -Math.PI/2 );
                break;
            case "ny":
                mat4.translate( planeMatrix, planeMatrix, [0, -1, 0] );
                mat4.rotateX( planeMatrix, planeMatrix, Math.PI/2 );
                break;
            case "pz":
                mat4.translate( planeMatrix, planeMatrix, [0, 0, 1] );
                break;
            case "nz":
                mat4.translate( planeMatrix, planeMatrix, [0, 0, -1] );
                mat4.rotateY( planeMatrix, planeMatrix, Math.PI );
                break;
        }
        plane.applyMatrix( planeMatrix );
        return plane;
    }

    return Cube;
} )