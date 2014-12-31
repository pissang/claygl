define(function(require) {

    'use strict';

    var DynamicGeometry = require('../DynamicGeometry');
    var BoundingBox = require('../math/BoundingBox');

    /**
     * @constructor qtek.geometry.Plane
     * @extends qtek.DynamicGeometry
     * @param {Object} [opt]
     * @param {number} [opt.widthSegments]
     * @param {number} [opt.heightSegments]
     */
    var Plane = DynamicGeometry.derive(
    /** @lends qtek.geometry.Plane# */
    {
        /**
         * @type {number}
         */
        widthSegments: 1,
        /**
         * @type {number}
         */
        heightSegments: 1
    }, function() {
        this.build();
    },
    /** @lends qtek.geometry.Plane.prototype */
    {
        /**
         * Build plane geometry
         */
        build: function() {
            var heightSegments = this.heightSegments;
            var widthSegments = this.widthSegments;
            var positions = this.attributes.position.value;
            var texcoords = this.attributes.texcoord0.value;
            var normals = this.attributes.normal.value;
            var faces = this.faces;

            positions.length = 0;
            texcoords.length = 0;
            normals.length = 0;
            faces.length = 0;

            for (var y = 0; y <= heightSegments; y++) {
                var t = y / heightSegments;
                for (var x = 0; x <= widthSegments; x++) {
                    var s = x / widthSegments;

                    positions.push([2 * s - 1, 2 * t - 1, 0]);
                    if (texcoords) {
                        texcoords.push([s, t]);
                    }
                    if (normals) {
                        normals.push([0, 0, 1]);
                    }
                    if (x < widthSegments && y < heightSegments) {
                        var i = x + y * (widthSegments + 1);
                        faces.push([i, i + 1, i + widthSegments + 1]);
                        faces.push([i + widthSegments + 1, i + 1, i + widthSegments + 2]);
                    }
                }
            }

            this.boundingBox = new BoundingBox();
            this.boundingBox.min.set(-1, -1, 0);
            this.boundingBox.max.set(1, 1, 0);
        }
    });

    return Plane;
});