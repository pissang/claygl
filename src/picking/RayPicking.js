define(function (require) {

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
    }, function () {
        this._ray = new Ray();
        this._ndc = new Vector2();
    },
    /** @lends qtek.picking.RayPicking.prototype */
    {

        /**
         * Pick the nearest intersection object in the scene
         * @param  {number} x Mouse position x
         * @param  {number} y Mouse position y
         * @param  {boolean} [forcePickAll=false] ignore ignorePicking
         * @return {qtek.picking.RayPicking~Intersection}
         */
        pick: function (x, y, forcePickAll) {
            var out = this.pickAll(x, y, [], forcePickAll);
            return out[0] || null;
        },

        /**
         * Pick all intersection objects, wich will be sorted from near to far
         * @param  {number} x Mouse position x
         * @param  {number} y Mouse position y
         * @param  {Array} [output]
         * @param  {boolean} [forcePickAll=false] ignore ignorePicking
         * @return {Array.<qtek.picking.RayPicking~Intersection>}
         */
        pickAll: function (x, y, output, forcePickAll) {
            this.renderer.screenToNDC(x, y, this._ndc);
            this.camera.castRay(this._ndc, this._ray);

            output = output || [];

            this._intersectNode(this.scene, output, forcePickAll || false);

            output.sort(this._intersectionCompareFunc);

            return output;
        },

        _intersectNode: function (node, out, forcePickAll) {
            if ((node instanceof Renderable) && node.isRenderable()) {
                if ((!node.ignorePicking || forcePickAll)
                    && (
                        // Only triangle mesh support ray picking
                        (node.mode === glenum.TRIANGLES && node.geometry.isUseIndices())
                        // Or if geometry has it's own pickByRay, pick, implementation
                        || node.geometry.pickByRay
                        || node.geometry.pick
                    )
                ) {
                    this._intersectRenderable(node, out);
                }
            }
            for (var i = 0; i < node._children.length; i++) {
                this._intersectNode(node._children[i], out, forcePickAll);
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
                // Use user defined picking algorithm
                if (geometry.pick) {
                    geometry.pick(
                        this._ndc.x, this._ndc.y,
                        this.renderer,
                        this.camera,
                        renderable, out
                    );
                    return;
                }
                // Use user defined ray picking algorithm
                else if (geometry.pickByRay) {
                    geometry.pickByRay(ray, renderable, out);
                    return;
                }

                var cullBack = (renderable.cullFace === glenum.BACK && renderable.frontFace === glenum.CCW)
                            || (renderable.cullFace === glenum.FRONT && renderable.frontFace === glenum.CW);

                var point;
                var indices = geometry.indices;
                var positionsAttr = geometry.attributes.position;
                // Check if valid.
                if (!positionsAttr || !positionsAttr.value || !indices) {
                    return;
                }
                for (var i = 0; i < indices.length; i += 3) {
                    var i1 = indices[i];
                    var i2 = indices[i + 1];
                    var i3 = indices[i + 2];
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
                            point, pointW, renderable, [i1, i2, i3], i / 3,
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
     * @param {number} triangleIndex
     * @param {number} distance
     */
    RayPicking.Intersection = function (point, pointWorld, target, triangle, triangleIndex, distance) {
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
         * Index of intersection triangle.
         */
        this.triangleIndex = triangleIndex;
        /**
         * Distance from intersection point to ray origin
         * @type {number}
         */
        this.distance = distance;
    };

    return RayPicking;
});