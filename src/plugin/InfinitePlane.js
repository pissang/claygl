define(function(require) {
    
    var Mesh = require('../Mesh');
    var DynamicGeometry = require('../DynamicGeometry');
    var Plane = require('../math/Plane');
    var Vector3 = require('../math/Vector3');
    var Matrix4 = require('../math/Matrix4');
    var Ray = require('../math/Ray');

    var PerspectiveCamera = require('../camera/Perspective');

    var glMatrix = require('../dep/glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;
    var vec4 = glMatrix.vec4;

    var uvs = [[0, 0], [0, 1], [1, 1], [1, 0]];
    var tris = [0, 1, 2, 2, 3, 0];

    var InfinitePlane = Mesh.derive({
        
        camera: null,

        plane: null,

        gridSize: 1,

        maxGrid: 0,

        // TODO
        frustumCulling: false

    }, function() {
        if (!this.geometry) {
            this.geometry = new DynamicGeometry();
        }
        if (!this.plane) {
            this.plane = new Plane();
        }
    }, {

        updateGeometry: function() {

            var coords = this._unProjectGrid();
            if (!coords) {
                return;
            }
            var positions = this.geometry.attributes.position.value;
            var normals = this.geometry.attributes.normal.value;
            var texcoords = this.geometry.attributes.texcoord0.value;
            var faces = this.geometry.faces;
            var nVertices = 0;
            var normal = vec3.clone(this.plane.normal._array);

            // if (this.gridSize > 0) {
                // TODO

            // } else {
            for (var i = 0; i < 6; i++) {
                var idx = tris[i];
                positions[nVertices] = coords[idx]._array;
                normals[nVertices] = normal;
                texcoords[nVertices] = uvs[idx];
                nVertices++;
            }
            faces[0] = [0, 1, 2];
            faces[1] = [3, 4, 5];
            this.geometry.dirty();
            // }
        },

        // http://fileadmin.cs.lth.se/graphics/theses/projects/projgrid/
        _unProjectGrid: (function() {
            
            var planeViewSpace = new Plane();
            var lines = [
                0, 1, 0, 2, 1, 3, 2, 3,
                4, 5, 4, 6, 5, 7, 6, 7,
                0, 4, 1, 5, 2, 6, 3, 7
            ];

            var start = new Vector3();
            var end = new Vector3();

            var points = [];

            // 1----2
            // |    |
            // 0----3
            var coords = [];
            for (var i = 0; i < 4; i++) {
                coords[i] = new Vector3(0, 0);
            }

            var ray = new Ray();

            return function() {
                planeViewSpace.copy(this.plane);
                planeViewSpace.applyTransform(this.camera.viewMatrix);

                var frustumVertices = this.camera.frustum.vertices;

                var nPoints = 0;
                // Intersect with lines of frustum
                for (var i = 0; i < 12; i++) {
                    start._array = frustumVertices[lines[i * 2]];
                    end._array = frustumVertices[lines[i * 2 + 1]];

                    var point = planeViewSpace.intersectLine(start, end, points[nPoints]);
                    if (point) {
                        if (!points[nPoints]) {
                            points[nPoints] = point;
                        }
                        nPoints++;
                    }
                }
                if (nPoints === 0) {
                    return;
                }
                for (var i = 0; i < nPoints; i++) {
                    points[i].applyProjection(this.camera.projectionMatrix);
                }
                var minX = points[0]._array[0];
                var minY = points[0]._array[1];
                var maxX = points[0]._array[0];
                var maxY = points[0]._array[1];
                for (var i = 1; i < nPoints; i++) {
                    maxX = Math.max(maxX, points[i]._array[0]);
                    maxY = Math.max(maxY, points[i]._array[1]);
                    minX = Math.min(minX, points[i]._array[0]);
                    minY = Math.min(minY, points[i]._array[1]);
                }
                if (minX == maxX || minY == maxY) {
                    return;
                }
                coords[0]._array[0] = minX;
                coords[0]._array[1] = minY;
                coords[1]._array[0] = minX;
                coords[1]._array[1] = maxY;
                coords[2]._array[0] = maxX;
                coords[2]._array[1] = maxY;
                coords[3]._array[0] = maxX;
                coords[3]._array[1] = minY;

                for (var i = 0; i < 4; i++) {
                    this.camera.castRay(coords[i], ray);
                    ray.intersectPlane(this.plane, coords[i]);
                }

                return coords;
            };
        })()
    });

    return InfinitePlane;
});