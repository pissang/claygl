define(function(require) {

    var DynamicGeometry = require('../DynamicGeometry');
    var BoundingBox = require('../math/BoundingBox');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;

    var Cone = DynamicGeometry.derive({

        topRadius : 0,
        bottomRadius : 1,

        height : 2,

        capSegments : 50,
        heightSegments : 1
    }, function() {
        this.build();
    }, {
        build : function() {
            var positions = this.attributes.position.value;
            var texcoords = this.attributes.texcoord0.value;
            var faces = this.faces;
            positions.length = 0;
            texcoords.length = 0;
            faces.length = 0;
            // Top cap
            var capSegRadial = Math.PI * 2 / this.capSegments;

            var topCap = [];
            var bottomCap = [];

            var r1 = this.topRadius;
            var r2 = this.bottomRadius;
            var y = this.height / 2;

            var c1 = vec3.fromValues(0, y, 0);
            var c2 = vec3.fromValues(0, -y, 0);
            for (var i = 0; i < this.capSegments; i++) {
                var theta = i * capSegRadial;
                var x = r1 * Math.sin(theta);
                var z = r1 * Math.cos(theta);
                topCap.push(vec3.fromValues(x, y, z));

                x = r2 * Math.sin(theta);
                z = r2 * Math.cos(theta);
                bottomCap.push(vec3.fromValues(x, -y, z));
            }
            topCap.push(vec3.clone(topCap[0]));
            bottomCap.push(vec3.clone(bottomCap[0]));

            // Build top cap
            positions.push(c1);
            // TODO
            texcoords.push(vec2.fromValues(0, 0));
            var n = this.capSegments;
            for (var i = 0; i < n; i++) {
                positions.push(topCap[i]);
                // TODO
                texcoords.push(vec2.fromValues(i / n, 0));
                faces.push([0, i+2, i+1]);
            }
            positions.push(topCap[i]);
            texcoords.push(vec2.fromValues(1, 0));

            // Build bottom cap
            var offset = positions.length;
            positions.push(c2);
            texcoords.push(vec2.fromValues(0, 1));
            for (var i = 0; i < n; i++) {
                positions.push(bottomCap[i]);
                // TODO
                texcoords.push(vec2.fromValues((i+1) / n, 1));
                faces.push([offset, offset+i+2, offset+i+1]);
            }
            positions.push(bottomCap[i]);
            texcoords.push(vec2.fromValues(1, 0));

            // Build side
            offset = positions.length;
            var n2 = this.heightSegments;
            for (var i =0 ; i < n; i++) {
                for (var j = 0; j < n2; j++) {
                    var v = j / n2;
                    var v2 = (j + 1) / n2;
                    positions.push(vec3.lerp(vec3.create(), topCap[i], bottomCap[i], v));
                    positions.push(vec3.lerp(vec3.create(), topCap[i+1], bottomCap[i+1], v));
                    positions.push(vec3.lerp(vec3.create(), topCap[i+1], bottomCap[i+1], v2));
                    positions.push(vec3.lerp(vec3.create(), topCap[i], bottomCap[i], v2));

                    texcoords.push(vec2.fromValues(i / n, v));
                    texcoords.push(vec2.fromValues((i+1) / n, v));
                    texcoords.push(vec2.fromValues((i+1) / n, v2));
                    texcoords.push(vec2.fromValues(i / n, v));

                    faces.push([offset, offset+1, offset+2]);
                    faces.push([offset+2, offset+3, offset]);

                    offset+=4;
                }
            }

            this.generateVertexNormals();
        }
    });

    return Cone;
})