define(function(require) {

    var DynamicGeometry = require('../DynamicGeometry');
    var BoundingBox = require('../math/BoundingBox');
    var ConeGeometry = require('./Cone');

    var Cylinder = DynamicGeometry.derive({
        radius : 1,
        height : 2,

        capSegments : 50,
        heightSegments : 1
    }, function() {
        this.build();
    }, {
        build : function() {
            var cone = new ConeGeometry({
                topRadius : this.radius,
                bottomRadius : this.radius,
                capSegments : this.capSegments,
                heightSegments : this.heightSegments,
            });

            this.attributes.position.value = cone.attributes.position.value;
            this.attributes.normal.value = cone.attributes.normal.value;
            this.attributes.texcoord0.value = cone.attributes.texcoord0.value;
            this.faces = cone.faces;

            this.boundingBox = cone.boundingBox;
        }
    })

    return Cylinder;
})