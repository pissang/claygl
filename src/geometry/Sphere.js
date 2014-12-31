define(function(require) {

    'use strict';

    var DynamicGeometry = require('../DynamicGeometry');
    var glMatrix = require('../dep/glmatrix');
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;
    var BoundingBox = require('../math/BoundingBox');

    /**
     * @constructor qtek.geometry.Sphere
     * @extends qtek.DynamicGeometry
     * @param {Object} [opt]
     * @param {number} [widthSegments]
     * @param {number} [heightSegments]
     * @param {number} [phiStart]
     * @param {number} [phiLength]
     * @param {number} [thetaStart]
     * @param {number} [thetaLength]
     * @param {number} [radius]
     */
    var Sphere = DynamicGeometry.derive(
    /** @lends qtek.geometry.Sphere# */
    {
        /**
         * @type {number}
         */
        widthSegments: 20,
        /**
         * @type {number}
         */
        heightSegments: 20,

        /**
         * @type {number}
         */
        phiStart: 0,
        /**
         * @type {number}
         */
        phiLength: Math.PI * 2,

        /**
         * @type {number}
         */
        thetaStart: 0,
        /**
         * @type {number}
         */
        thetaLength: Math.PI,

        /**
         * @type {number}
         */
        radius: 1

    }, function() {
        this.build();
    },
    /** @lends qtek.geometry.Sphere.prototype */
    {
        /**
         * Build sphere geometry
         */
        build: function() {
            var positions = this.attributes.position.value;
            var texcoords = this.attributes.texcoord0.value;
            var normals = this.attributes.normal.value;

            positions.length = 0;
            texcoords.length = 0;
            normals.length = 0;
            this.faces.length = 0;

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

                    // X axis is inverted so texture can be mapped from left to right
                    x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                    y = radius * Math.cos(thetaStart + v * thetaLength);
                    z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);

                    positions.push(vec3.fromValues(x, y, z));
                    texcoords.push(vec2.fromValues(u, v));

                    normal = vec3.fromValues(x, y, z);
                    vec3.normalize(normal, normal);
                    normals.push(normal);
                }
            }

            var i1, i2, i3, i4;
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
        }
    });

    return Sphere;
});