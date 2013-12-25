define(function(require) {

    var Vector3 = require('./Vector3');
    var BoundingBox = require('./BoundingBox');
    var Plane = require('./Plane');
    var glmatrix = require('glmatrix');

    var vec3 = glmatrix.vec3;

    var Frustum = function() {

        this.planes = [];

        for (var i = 0; i < 6; i++) {
            this.planes.push(new Plane());
        }

        this.boundingBox = new BoundingBox();

        this.vertices = [];
        for (var i = 0; i < 8; i++) {
            this.vertices[i] = vec3.fromValues(0, 0, 0);
        }
    };

    Frustum.prototype = {

        // http://web.archive.org/web/20120531231005/http://crazyjoke.free.fr/doc/3D/plane%20extraction.pdf
        setFromProjection : function(projectionMatrix) {

            var planes = this.planes;
            var m = projectionMatrix._array;
            var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
            var m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
            var m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
            var m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];

            // Update planes
            vec3.set(planes[0].normal._array, m3 - m0, m7 - m4, m11 - m8);
            planes[0].distance = m15 - m12;
            planes[0].normalize();

            vec3.set(planes[1].normal._array, m3 + m0, m7 + m4, m11 + m8);
            planes[1].distance = m15 + m12;
            planes[1].normalize();
            
            vec3.set(planes[2].normal._array, m3 + m1, m7 + m5, m11 + m9);
            planes[2].distance = m15 + m13;
            planes[2].normalize();
            
            vec3.set(planes[3].normal._array, m3 - m1, m7 - m5, m11 - m9);
            planes[3].distance = m15 - m13;
            planes[3].normalize();
            
            vec3.set(planes[4].normal._array, m3 - m2, m7 - m6, m11 - m10);
            planes[4].distance = m15 - m14;
            planes[4].normalize();
            
            vec3.set(planes[5].normal._array, m3 + m2, m7 + m6, m11 + m10);
            planes[5].distance = m15 + m14;
            planes[5].normalize();

            // Perspective projection
            if (m15 === 0)  {
                var aspect = m5 / m0;
                var zNear = -m14 / (m10 - 1);
                var zFar = -m14 / (m10 + 1);
                var farY = -zFar / m5;
                var nearY = -zNear / m5;
                // Update bounding box
                this.boundingBox.min.set(-farY * aspect, -farY, zFar);
                this.boundingBox.max.set(farY * aspect, farY, zNear);
                // update vertices
                var vertices = this.vertices;
                //--- min z
                // min x
                vec3.set(vertices[0], -farY * aspect, -farY, zFar);
                vec3.set(vertices[1], -farY * aspect, farY, zFar);
                // max x
                vec3.set(vertices[2], farY * aspect, -farY, zFar);
                vec3.set(vertices[3], farY * aspect, farY, zFar);
                //-- max z
                vec3.set(vertices[4], -nearY * aspect, -nearY, zNear);
                vec3.set(vertices[5], -nearY * aspect, nearY, zNear);
                vec3.set(vertices[6], nearY * aspect, -nearY, zNear);
                vec3.set(vertices[7], nearY * aspect, nearY, zNear);
            } else { // Orthographic projection
                var left = (-1 - m12) / m0;
                var right = (1 - m12) / m0;
                var top = (1 - m13) / m5;
                var bottom = (-1 - m13) / m5;
                var near = (-1 - m14) / m10;
                var far = (1 - m14) / m10;

                this.boundingBox.min.set(left, bottom, far);
                this.boundingBox.max.set(right, top, near);
                // Copy the vertices from bounding box directly
                for (var i = 0; i < 8; i++) {
                    vec3.copy(this.vertices[i], this.boundingBox.vertices[i]);
                }
            }

            return this;
        },

        getTransformedBoundingBox : (function() {
            
            var tmpVec3 = vec3.create();

            return function(bbox, matrix) {
                var vertices = this.vertices;

                var m4 = matrix._array;
                var _min = bbox.min._array;
                var _max = bbox.max._array;
                var v = vertices[0];
                vec3.transformMat4(tmpVec3, v, m4);
                vec3.copy(_min, tmpVec3);
                vec3.copy(_max, tmpVec3);

                for (var i = 1; i < 8; i++) {
                    v = vertices[i];
                    vec3.transformMat4(tmpVec3, v, m4);

                    _min[0] = Math.min(tmpVec3[0], _min[0]);
                    _min[1] = Math.min(tmpVec3[1], _min[1]);
                    _min[2] = Math.min(tmpVec3[2], _min[2]);

                    _max[0] = Math.max(tmpVec3[0], _max[0]);
                    _max[1] = Math.max(tmpVec3[1], _max[1]);
                    _max[2] = Math.max(tmpVec3[2], _max[2]);
                }

                bbox.min._dirty = true;
                bbox.max._dirty = true;
            };
        }) ()
    }
    return Frustum;
});