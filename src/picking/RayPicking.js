define(function(require) {

    var Base = require('../core/Base');
    var Ray = require('../math/Ray');
    var Vector2 = require('../math/Vector2');
    var Vector3 = require('../math/Vector3');
    var Matrix4 = require('../math/Matrix4');
    var Renderable = require('../Renderable');
    var glenum = require('../core/glenum');

    /**
     * @constructor qtek.picking.RayPicking
     * @extends qtek.core.Base
     */
    var RayPicking = Base.extend(
    /** @lends qtek.picking.RayPicking# */
    {
        /**
         * Target scene
         * @type {qtek.Scene}
         */
        scene: null,
        /**
         * Target camera
         * @type {qtek.Camera}
         */
        camera: null,
        /**
         * Target renderer
         * @type {qtek.Renderer}
         */
        renderer: null
    }, function() {
        this._ray = new Ray();
        this._ndc = new Vector2();
    },
    /** @lends qtek.picking.RayPicking.prototype */
    {

        /**
         * Pick the nearest intersection object in the scene
         * @param  {number} x Mouse position x
         * @param  {number} y Mouse position y
         * @return {qtek.picking.RayPicking~Intersection}
         */
        pick: function (x, y) {
            var out = this.pickAll(x, y);
            return out[0] || null;
        },

        /**
         * Pick all intersection objects, wich will be sorted from near to far
         * @param  {number} x Mouse position x
         * @param  {number} y Mouse position y
         * @param  {Array} [output]
         * @return {Array.<qtek.picking.RayPicking~Intersection>}
         */
        pickAll: function (x, y, output) {
            this.renderer.screenToNdc(x, y, this._ndc);
            this.camera.castRay(this._ndc, this._ray);

            output = output || [];

            this._intersectNode(this.scene, output);

            output.sort(this._intersectionCompareFunc);

            return output;
        },

        _intersectNode: function (node, out) {
            if ((node instanceof Renderable) && node.isRenderable()) {
                if (!node.ignorePicking && node.geometry.isUseIndices()) {
                    this._intersectRenderable(node, out);
                }
            }
            for (var i = 0; i < node._children.length; i++) {
                this._intersectNode(node._children[i], out);
            }
        },

        _intersectRenderable: (function () {

            var v1 = new Vector3();
            var v2 = new Vector3();
            var v3 = new Vector3();
            var ray = new Ray();
            var worldInverse = new Matrix4();

            return function (renderable, out) {

                ray.copy(this._ray);
                Matrix4.invert(worldInverse, renderable.worldTransform);

                ray.applyTransform(worldInverse);

                var geometry = renderable.geometry;
                if (geometry.boundingBox) {
                    if (!ray.intersectBoundingBox(geometry.boundingBox)) {
                        return;
                    }
                }
                // Use user defined ray picking algorithm
                if (geometry.pickByRay) {
                    var intersection = geometry.pickByRay(ray);
                    if (intersection) {
                        out.push(intersection);
                    }
                    return;
                }

                var cullBack = (renderable.cullFace === glenum.BACK && renderable.frontFace === glenum.CCW)
                            || (renderable.cullFace === glenum.FRONT && renderable.frontFace === glenum.CW);

                var point;
                var indices = geometry.indices;
                var positionsAttr = geometry.attributes.position;
                for (var i = 0; i < indices.length;) {
                    var i1 = indices[i++];
                    var i2 = indices[i++];
                    var i3 = indices[i++];
                    positionsAttr.get(i1, v1._array);
                    positionsAttr.get(i2, v2._array);
                    positionsAttr.get(i3, v3._array);

                    if (cullBack) {
                        point = ray.intersectTriangle(v1, v2, v3, renderable.culling);
                    }
                    else {
                        point = ray.intersectTriangle(v1, v3, v2, renderable.culling);
                    }
                    if (point) {
                        var pointW = new Vector3();
                        Vector3.transformMat4(pointW, point, renderable.worldTransform);
                        out.push(new RayPicking.Intersection(
                            point, pointW, renderable, [i1, i2, i3],
                            Vector3.dist(pointW, this._ray.origin)
                        ));
                    }
                }
            };
        })(),

        _intersectionCompareFunc: function (a, b) {
            return a.distance - b.distance;
        }
    });

    /**
     * @constructor qtek.picking.RayPicking~Intersection
     * @param {qtek.math.Vector3} point
     * @param {qtek.math.Vector3} pointWorld
     * @param {qtek.Node} target
     * @param {Array.<number>} triangle
     * @param {number} distance
     */
    RayPicking.Intersection = function (point, pointWorld, target, triangle, distance) {
        /**
         * Intersection point in local transform coordinates
         * @type {qtek.math.Vector3}
         */
        this.point = point;
        /**
         * Intersection point in world transform coordinates
         * @type {qtek.math.Vector3}
         */
        this.pointWorld = pointWorld;
        /**
         * Intersection scene node
         * @type {qtek.Node}
         */
        this.target = target;
        /**
         * Intersection triangle, which is an array of vertex index
         * @type {Array.<number>}
         */
        this.triangle = triangle;
        /**
         * Distance from intersection point to ray origin
         * @type {number}
         */
        this.distance = distance;
    };

    return RayPicking;
});