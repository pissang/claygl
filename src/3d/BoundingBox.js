define(function(require) {

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");

    var BoundingBox = Base.derive(function() {
        return {
            min : new Vector3(),
            max : new Vector3()
        }
    }, {
        updateFromVertices : function(vertices) {
            if (vertices.length > 0) {
                var min = vertices[0].slice();
                var max = vertices[1].slice();
                for (var i = 1; i < vertices.length; i++) {
                    var vertex = vertices[i];

                    min[0] = Math.min(vertex[0], min[0]);
                    min[1] = Math.min(vertex[1], min[1]);
                    min[2] = Math.min(vertex[2], min[2]);

                    max[0] = Math.max(vertex[0], max[0]);
                    max[1] = Math.max(vertex[1], max[1]);
                    max[2] = Math.max(vertex[2], max[2]);
                }

                this.min.set(min[0], min[1], min[2]);
                this.max.set(max[0], max[1], max[2]);
            }
        }
    });

    return BoundingBox;
});