
define(function(require) {

    var Geometry = require('../geometry');
    var Plane = require('./plane');
    var Matrix4 = require('core/matrix4');
    var Vector3 = require('core/vector3');
    var _ = require('_');

    var planeMatrix = new Matrix4();
    
    var Cube = Geometry.derive(function() {

        return {
            widthSegments : 1,
            heightSegments : 1,
            depthSegments : 1,
            // TODO double side material
            inside : false
        }
    }, function() {
        var planes = {
            "px" : createPlane("px", this.depthSegments, this.heightSegments),
            "nx" : createPlane("nx", this.depthSegments, this.heightSegments),
            "py" : createPlane("py", this.widthSegments, this.depthSegments),
            "ny" : createPlane("ny", this.widthSegments, this.depthSegments),
            "pz" : createPlane("pz", this.widthSegments, this.heightSegments),
            "nz" : createPlane("nz", this.widthSegments, this.heightSegments),
        };
        var cursor = 0;
        for (var pos in planes) {
            _.each(['position', 'texcoord0', 'normal'], function(attrName) {
                var attrArray = planes[pos].attributes[attrName].value;
                for (var i = 0; i < attrArray.length; i++) {
                    var value = attrArray[i];
                    if (this.inside && attrName === "normal") {
                        value[0] = -value[0];
                        value[1] = -value[1];
                        value[2] = -value[2];
                    }
                    this.attributes[attrName].value.push(value);
                }
                var plane = planes[pos];
                for (var i = 0; i < plane.faces.length; i++) {
                    var face = plane.faces[i];
                    this.faces.push([ face[0]+cursor, face[1]+cursor, face[2]+cursor ]);
                }
            }, this)
            cursor += planes[pos].getVerticesNumber();
        }
    })

    function createPlane(pos, widthSegments, heightSegments) {

        planeMatrix.identity();

        var plane = new Plane({
            widthSegments : widthSegments,
            heightSegments : heightSegments
        })

        switch(pos) {
            case "px":
                planeMatrix.translate(new Vector3(1, 0, 0));
                planeMatrix.rotateY(Math.PI/2);
                break;
            case "nx":
                planeMatrix.translate(new Vector3(-1, 0, 0));
                planeMatrix.rotateY(-Math.PI/2);
                break;
            case "py":
                planeMatrix.translate(new Vector3(0, 1, 0));
                planeMatrix.rotateX(-Math.PI/2);
                break;
            case "ny":
                planeMatrix.translate(new Vector3(0, -1, 0));
                planeMatrix.rotateX(Math.PI/2);
                break;
            case "pz":
                planeMatrix.translate(new Vector3(0, 0, 1));
                break;
            case "nz":
                planeMatrix.translate(new Vector3(0, 0, -1));
                planeMatrix.rotateY(Math.PI);
                break;
        }
        plane.applyMatrix(planeMatrix);
        return plane;
    }

    return Cube;
})