
define(function(require) {

    var Geometry = require('../Geometry');
    var Plane = require('./Plane');
    var Matrix4 = require('core/Matrix4');
    var Vector3 = require('core/Vector3');
    var BoundingBox = require('../BoundingBox');

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
        var self = this;
        for (var pos in planes) {
            ['position', 'texcoord0', 'normal'].forEach(function(attrName) {
                var attrArray = planes[pos].attributes[attrName].value;
                for (var i = 0; i < attrArray.length; i++) {
                    var value = attrArray[i];
                    if (this.inside && attrName === "normal") {
                        value[0] = -value[0];
                        value[1] = -value[1];
                        value[2] = -value[2];
                    }
                    self.attributes[attrName].value.push(value);
                }
                var plane = planes[pos];
                for (var i = 0; i < plane.faces.length; i++) {
                    var face = plane.faces[i];
                    self.faces.push([face[0]+cursor, face[1]+cursor, face[2]+cursor]);
                }
            });
            cursor += planes[pos].getVerticesNumber();
        }

        this.boundingBox = new BoundingBox();
        this.boundingBox.max.set(1, 1, 1);
        this.boundingBox.min.set(-1, -1, -1);
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