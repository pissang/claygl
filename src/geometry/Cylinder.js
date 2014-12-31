define(function(require) {

    'use strict';

    var DynamicGeometry = require('../DynamicGeometry');
    var ConeGeometry = require('./Cone');

    /**
     * @constructor qtek.geometry.Cylinder
     * @extends qtek.DynamicGeometry
     * @param {Object} [opt]
     * @param {number} [opt.radius]
     * @param {number} [opt.height]
     * @param {number} [opt.capSegments]
     * @param {number} [opt.heightSegments]
     */
    var Cylinder = DynamicGeometry.derive(
    /** @lends qtek.geometry.Cylinder# */
    {
        /**
         * @type {number}
         */
        radius: 1,

        /**
         * @type {number}
         */
        height: 2,

        /**
         * @type {number}
         */
        capSegments: 50,

        /**
         * @type {number}
         */
        heightSegments: 1
    }, function() {
        this.build();
    },
    /** @lends qtek.geometry.Cylinder.prototype */
    {
        /**
         * Build cylinder geometry
         */
        build: function() {
            var cone = new ConeGeometry({
                topRadius: this.radius,
                bottomRadius: this.radius,
                capSegments: this.capSegments,
                heightSegments: this.heightSegments,
                height: this.height
            });

            this.attributes.position.value = cone.attributes.position.value;
            this.attributes.normal.value = cone.attributes.normal.value;
            this.attributes.texcoord0.value = cone.attributes.texcoord0.value;
            this.faces = cone.faces;

            this.boundingBox = cone.boundingBox;
        }
    });

    return Cylinder;
});