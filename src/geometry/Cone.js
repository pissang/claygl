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

            // Build top cap
            positions.push(c1);
            // TODO
            texcoords.push(vec2.fromValues(0, 1));
            var n = this.capSegments;
            for (var i = 0; i < n; i++) {
                positions.push(topCap[i]);
                // TODO
                texcoords.push(vec2.fromValues(i / n, 0));
                faces.push([0, i+1, (i+1) % n + 1]);
            }

            // Build bottom cap
            var offset = positions.length;
            positions.push(c2);
            texcoords.push(vec2.fromValues(0, 1));
            for (var i = 0; i < n; i++) {
                positions.push(bottomCap[i]);
                // TODO
                texcoords.push(vec2.fromValues(i / n, 0));
                faces.push([offset, offset+((i+1) % n + 1), offset+i+1]);
            }

            // // Build side
            offset = positions.length;
            var n2 = this.heightSegments;
            for (var i =0; i < n; i++) {
                for (var j = 0; j < n2+1; j++) {
                    var v = j / n2;
                    positions.push(vec3.lerp(vec3.create(), topCap[i], bottomCap[i], v));
                    texcoords.push(vec2.fromValues(i / n, v));
                }
            }
            for (var i = 0; i < n; i++) {
                for (var j = 0; j < n2; j++) {
                    var i1 = i * (n2 + 1) + j;
                    var i2 = ((i + 1) % n) * (n2 + 1) + j;
                    var i3 = ((i + 1) % n) * (n2 + 1) + j + 1;
                    var i4 = i * (n2 + 1) + j + 1;
                    faces.push([offset+i2, offset+i1, offset+i4]);
                    faces.push([offset+i4, offset+i3, offset+i2]);
                }
            }

            this.generateVertexNormals();

            this.boundingBox = new BoundingBox();
            var r = Math.max(this.topRadius, this.bottomRadius);
            this.boundingBox.min.set(-r, -this.height/2, -r);
            this.boundingBox.max.set(r, this.height/2, r);
        }
    });

    return Cone;
})