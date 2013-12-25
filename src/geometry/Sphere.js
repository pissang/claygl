define(function(require) {

    var Geometry = require('../Geometry');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;
    var BoundingBox = require('../math/BoundingBox');

	// From three.js SphereGeometry
    var Sphere = Geometry.derive(function() {

        return {
            widthSegments : 20,
            heightSegments : 20,

            phiStart : 0,
            phiLength : Math.PI * 2,

            thetaStart : 0,
            thetaLength : Math.PI,

            radius : 1
        }
    }, function() {
        
        var positions = this.attributes.position.value;
        var texcoords = this.attributes.texcoord0.value;
        var normals = this.attributes.normal.value;

        var x, y, z,
            u, v,
            i, j;
        var normal;

        var heightSegments = this.heightSegments;
        var widthSegments = this.widthSegments;
        var radius = this.radius;
        var phiStart = this.phiStart;
        var phiLength = this.phiLength;
        var thetaStart = this.thetaStart;
        var thetaLength = this.thetaLength;
        var radius = this.radius;

        for (j = 0; j <= heightSegments; j ++) {
            for (i = 0; i <= widthSegments; i ++) {
                u = i / widthSegments;
                v = j / heightSegments;

                x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                y = radius * Math.cos(thetaStart + v * thetaLength);
                z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);

                positions.push(vec3.fromValues(x, y, z));
                texcoords.push(vec2.fromValues(u, v));

                normal = vec3.fromValues(x, y, z);
                vec3.normalize(normal, normal)
                normals.push(normal);
            }
        }

        var p1, p2, p3,
            i1, i2, i3, i4;
        var faces = this.faces;

        var len = widthSegments + 1;

        for (j = 0; j < heightSegments; j ++) {
            for (i = 0; i < widthSegments; i ++) {
                i2 = j * len + i;
                i1 = (j * len + i + 1);
                i4 = (j + 1) * len + i + 1;
                i3 = (j + 1) * len + i;

                faces.push(vec3.fromValues(i1, i2, i4));
                faces.push(vec3.fromValues(i2, i3, i4));
            }
        }

        this.boundingBox = new BoundingBox();
        this.boundingBox.max.set(radius, radius, radius);
        this.boundingBox.min.set(-radius, -radius, -radius);
    })

    return Sphere;
})