define(function(require) {

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;
    var vec4 = glMatrix.vec4;

    var _min = vec3.create();
    var _max = vec3.create();

    var BoundingBox = Base.derive(function() {
        var ret = {
            min : new Vector3(),
            max : new Vector3(),
            // Cube vertices
            vertices : []
        }
        for (var i = 0; i < 8; i++) {
            ret.vertices[i] = vec4.fromValues(0, 0, 0, 1);
        }
        return ret;
    }, {
        updateFromVertices : function(vertices) {
            if (vertices.length > 0) {
                vec3.copy(_min, vertices[0]);
                vec3.copy(_max, vertices[0]);
                for (var i = 1; i < vertices.length; i++) {
                    var vertex = vertices[i];

                    _min[0] = Math.min(vertex[0], _min[0]);
                    _min[1] = Math.min(vertex[1], _min[1]);
                    _min[2] = Math.min(vertex[2], _min[2]);

                    _max[0] = Math.max(vertex[0], _max[0]);
                    _max[1] = Math.max(vertex[1], _max[1]);
                    _max[2] = Math.max(vertex[2], _max[2]);
                }
                vec3.copy(this.min._array, _min);
                vec3.copy(this.max._array, _max);
            }
        },

        applyTransform : function(matrix) {
            if (this.min._dirty || this.max._dirty) {
                this.updateVertices();
                this.min._dirty = false;
                this.max._dirty = false;
            }

            var m4 = matrix._array;
            vec3.set(_min, 99, 99, 99);
            vec3.set(_max, -99, -99, -99);
            for (var i = 0; i < 8; i++) {
                var v = this.vertices[i];
                vec4.transformMat4(v, v, m4);
                v[0] /= v[3];
                v[1] /= v[3];
                v[2] /= v[3];

                _min[0] = Math.min(v[0], _min[0]);
                _min[1] = Math.min(v[1], _min[1]);
                _min[2] = Math.min(v[2], _min[2]);

                _max[0] = Math.max(v[0], _max[0]);
                _max[1] = Math.max(v[1], _max[1]);
                _max[2] = Math.max(v[2], _max[2]);
            }
            vec3.copy(this.min._array, _min);
            vec3.copy(this.max._array, _max);
        },

        updateVertices : function() {
            var min = this.min._array;
            var max = this.max._array;
            var vertices = this.vertices;
            vec4.set(vertices[0], min[0], min[1], min[2], 1);
            vec4.set(vertices[1], min[0], min[1], max[2], 1);
            vec4.set(vertices[2], min[0], max[1], max[2], 1);
            vec4.set(vertices[3], min[0], max[1], min[2], 1);
            vec4.set(vertices[4], max[0], max[1], min[2], 1);
            vec4.set(vertices[5], max[0], min[1], min[2], 1);
            vec4.set(vertices[6], max[0], min[1], max[2], 1);
            vec4.set(vertices[7], max[0], max[1], max[2], 1);
        },

        copy : function(boundingBox) {
            this.min.copy(boundingBox.min);
            this.max.copy(boundingBox.max);
        }
    });

    return BoundingBox;
});