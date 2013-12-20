define(function(require) {

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var BoundingBox = function(min, max) {
        this.min = min || new Vector3();
        this.max = max || new Vector3();
        // Cube vertices
        var vertices = [];
        for (var i = 0; i < 8; i++) {
            vertices[i] = vec3.fromValues(0, 0, 0, 1);
        }
        this.vertices = vertices;
    }
    BoundingBox.prototype = {
        
        constructor : BoundingBox,

        updateFromVertices : function(vertices) {
            if (vertices.length > 0) {
                var _min = this.min._array;
                var _max = this.max._array;
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
                this.min._dirty = true;
                this.max._dirty = true;
            }
        },

        applyTransform : function(matrix) {
            if (this.min._dirty || this.max._dirty) {
                this.updateVertices();
                this.min._dirty = false;
                this.max._dirty = false;
            }

            var m4 = matrix._array;
            var _min = this.min._array;
            var _max = this.max._array;

            var v = this.vertices[0];
            vec3.transformMat4(v, v, m4);
            vec3.copy(_min, v);
            vec3.copy(_max, v);

            for (var i = 1; i < 8; i++) {
                v = this.vertices[i];
                vec3.transformMat4(v, v, m4);

                _min[0] = Math.min(v[0], _min[0]);
                _min[1] = Math.min(v[1], _min[1]);
                _min[2] = Math.min(v[2], _min[2]);

                _max[0] = Math.max(v[0], _max[0]);
                _max[1] = Math.max(v[1], _max[1]);
                _max[2] = Math.max(v[2], _max[2]);
            }

            this.min._dirty = true;
            this.max._dirty = true;
        },

        applyProjection : function(matrix) {
            if (this.min._dirty || this.max._dirty) {
                this.updateVertices();
                this.min._dirty = false;
                this.max._dirty = false;
            }

            var m = matrix._array;
            // min in near plane
            var v1 = this.vertices[0];
            // max in near plane
            var v2 = this.vertices[3];
            // max in far plane
            var v3 = this.vertices[7];

            var _min = this.min._array;
            var _max = this.max._array;

            var w = 1 / (m[3] * v1[0] + m[7] * v1[1] + m[11] * v1[2] + m[15]);
            _min[0] = (m[0] * v1[0] + m[4] * v1[1] + m[8] * v1[2] + m[12]) * w;
            _min[1] = (m[1] * v1[0] + m[5] * v1[1] + m[9] * v1[2] + m[13]) * w;
            _min[2] = (m[2] * v1[0] + m[6] * v1[1] + m[10] * v1[2] + m[14]) * w;

            w = 1 / (m[3] * v2[0] + m[7] * v2[1] + m[11] * v2[2] + m[15]);
            _max[0] = (m[0] * v2[0] + m[4] * v2[1] + m[8] * v2[2] + m[12]) * w;
            _max[1] = (m[1] * v2[0] + m[5] * v2[1] + m[9] * v2[2] + m[13]) * w;

            w = 1 / (m[3] * v3[0] + m[7] * v3[1] + m[11] * v3[2] + m[15]);
            _max[2] = (m[2] * v3[0] + m[6] * v3[1] + m[10] * v3[2] + m[14]) * w;

            this.min._dirty = true;
            this.max._dirty = true;
        },

        updateVertices : function() {
            var min = this.min._array;
            var max = this.max._array;
            var vertices = this.vertices;
            //--- near z
            // min x
            vec3.set(vertices[0], min[0], min[1], min[2]);
            vec3.set(vertices[1], min[0], max[1], min[2]);
            // max x
            vec3.set(vertices[2], max[0], min[1], min[2]);
            vec3.set(vertices[3], max[0], max[1], min[2]);

            //-- far z
            vec3.set(vertices[4], min[0], min[1], max[2]);
            vec3.set(vertices[5], min[0], max[1], max[2]);
            vec3.set(vertices[6], max[0], min[1], max[2]);
            vec3.set(vertices[7], max[0], max[1], max[2]);
        },

        copy : function(boundingBox) {
            this.min.copy(boundingBox.min);
            this.max.copy(boundingBox.max);
        }
    };

    return BoundingBox;
});