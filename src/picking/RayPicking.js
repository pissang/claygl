define(function(require) {
    
    var Base = require('../core/Base');
    var Ray = require('../math/Ray');
    var Vector2 = require('../math/Vector2');
    var Vector3 = require('../math/Vector3');
    var Matrix4 = require('../math/Matrix4');
    var Renderable = require('../Renderable');
    var StaticGeometry = require('../StaticGeometry');
    var glenum = require('../core/glenum');

    var RayPicking = Base.derive({
        scene: null,
        camera: null,
        renderer: null
    }, function() {
        this._ray = new Ray();
        this._ndc = new Vector2();
    }, {

        pick: function(x, y) {
            var out = this.pickAll(x, y);
            return out[0] || null;
        },

        pickAll: function(x, y) {
            this.renderer.screenToNdc(x, y, this._ndc);
            this.camera.castRay(this._ndc, this._ray);

            var output = [];

            this._intersectNode(this.scene, output);

            output.sort(this._intersectionCompareFunc);

            return output;
        },

        _intersectNode: function(node, out) {
            if ((node instanceof Renderable) && node.geometry) {
                if (node.geometry.isUseFace()) {
                    this._intersectRenderable(node, out);
                }
            }
            for (var i = 0; i < node._children.length; i++) {
                this._intersectNode(node._children[i], out);
            }
        },

        _intersectRenderable: (function() {
            
            var v1 = new Vector3();
            var v2 = new Vector3();
            var v3 = new Vector3();
            var intersectionPoint = new Vector3();
            var ray = new Ray();
            var worldInverse = new Matrix4();

            return function(renderable, out) {
                
                ray.copy(this._ray);
                Matrix4.invert(worldInverse, renderable.worldTransform);

                ray.applyTransform(worldInverse);

                var geometry = renderable.geometry;
                if (geometry.boundingBox) {
                    if (!ray.intersectBoundingBox(geometry.boundingBox)) {
                        return false;
                    }
                }
                var isStatic = geometry instanceof StaticGeometry;
                var cullBack = (renderable.cullFace === glenum.BACK && renderable.frontFace === glenum.CCW)
                            || (renderable.cullFace === glenum.FRONT && renderable.frontFace === glenum.CW);

                if (isStatic) {
                    var faces = geometry.faces;
                    var positions = geometry.attributes.position.value;
                    for (var i = 0; i < faces.length;) {
                        var i1 = faces[i++] * 3;
                        var i2 = faces[i++] * 3;
                        var i3 = faces[i++] * 3;

                        v1._array[0] = positions[i1];
                        v1._array[1] = positions[i1 + 1];
                        v1._array[2] = positions[i1 + 2];

                        v2._array[0] = positions[i2];
                        v2._array[1] = positions[i2 + 1];
                        v2._array[2] = positions[i2 + 2];
                        
                        v3._array[0] = positions[i3];
                        v3._array[1] = positions[i3 + 1];
                        v3._array[2] = positions[i3 + 2];

                        var point;
                        if (cullBack) {
                            point = ray.intersectTriangle(v1, v2, v3, renderable.culling, intersectionPoint);
                        } else {
                            point = ray.intersectTriangle(v1, v3, v2, renderable.culling, intersectionPoint);
                        }
                        if (point) {
                            var pointW = new Vector3();
                            Vector3.transformMat4(pointW, point, renderable.worldTransform);
                            out.push(new RayPicking.Intersection(
                                pointW, renderable, [[i1, i2, i3]], Vector3.dist(pointW, this._ray.origin)
                            ));
                        }
                    }
                } else {
                    var faces = geometry.faces;
                    var positions = geometry.attributes.position.value;
                    for (var i = 0; i < faces.length; i++) {
                        var face = faces[i];
                        var i1 = face[0];
                        var i2 = face[1];
                        var i3 = face[2];

                        v1.setArray(positions[i1]);
                        v2.setArray(positions[i2]);
                        v3.setArray(positions[i3]);

                        var point;
                        if (cullBack) {
                            point = ray.intersectTriangle(v1, v2, v3, renderable.culling, intersectionPoint);
                        } else {
                            point = ray.intersectTriangle(v1, v3, v2, renderable.culling, intersectionPoint);
                        }
                        if (point) {
                            var pointW = new Vector3();
                            Vector3.transformMat4(pointW, point, renderable.worldTransform);
                            out.push(new RayPicking.Intersection(
                                pointW, renderable, [i1, i2, i3], Vector3.dist(pointW, this._ray.origin)
                            ));
                        }
                    }
                }
            };
        })(),

        _intersectionCompareFunc: function(a, b) {
            return a.distance - b.distance;
        }
    });

    RayPicking.Intersection = function(point, target, tri, distance) {
        this.point = point;
        this.target = target;
        this.triangle = tri;
        this.distance = distance;
    }

    return RayPicking;
});