import Geometry from '../Geometry';
import BoundingBox from '../math/BoundingBox';

/**
 * @constructor clay.geometry.Plane
 * @extends clay.Geometry
 * @param {Object} [opt]
 * @param {number} [opt.widthSegments]
 * @param {number} [opt.heightSegments]
 */
var Plane = Geometry.extend(
/** @lends clay.geometry.Plane# */
{
    dynamic: false,
    /**
     * @type {number}
     */
    widthSegments: 1,
    /**
     * @type {number}
     */
    heightSegments: 1
}, function() {
    this.build();
},
/** @lends clay.geometry.Plane.prototype */
{
    /**
     * Build plane geometry
     */
    build: function() {
        var heightSegments = this.heightSegments;
        var widthSegments = this.widthSegments;
        var attributes = this.attributes;
        var positions = [];
        var texcoords = [];
        var normals = [];
        var faces = [];

        for (var y = 0; y <= heightSegments; y++) {
            var t = y / heightSegments;
            for (var x = 0; x <= widthSegments; x++) {
                var s = x / widthSegments;

                positions.push([2 * s - 1, 2 * t - 1, 0]);
                if (texcoords) {
                    texcoords.push([s, t]);
                }
                if (normals) {
                    normals.push([0, 0, 1]);
                }
                if (x < widthSegments && y < heightSegments) {
                    var i = x + y * (widthSegments + 1);
                    faces.push([i, i + 1, i + widthSegments + 1]);
                    faces.push([i + widthSegments + 1, i + 1, i + widthSegments + 2]);
                }
            }
        }

        attributes.position.fromArray(positions);
        attributes.texcoord0.fromArray(texcoords);
        attributes.normal.fromArray(normals);

        this.initIndicesFromArray(faces);

        this.boundingBox = new BoundingBox();
        this.boundingBox.min.set(-1, -1, 0);
        this.boundingBox.max.set(1, 1, 0);
    }
});

export default Plane;
