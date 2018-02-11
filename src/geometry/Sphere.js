import Geometry from '../Geometry';
import BoundingBox from '../math/BoundingBox';

/**
 * @constructor clay.geometry.Sphere
 * @extends clay.Geometry
 * @param {Object} [opt]
 * @param {number} [widthSegments]
 * @param {number} [heightSegments]
 * @param {number} [phiStart]
 * @param {number} [phiLength]
 * @param {number} [thetaStart]
 * @param {number} [thetaLength]
 * @param {number} [radius]
 */
var Sphere = Geometry.extend(/** @lends clay.geometry.Sphere# */ {
    dynamic: false,
    /**
     * @type {number}
     */
    widthSegments: 40,
    /**
     * @type {number}
     */
    heightSegments: 20,

    /**
     * @type {number}
     */
    phiStart: 0,
    /**
     * @type {number}
     */
    phiLength: Math.PI * 2,

    /**
     * @type {number}
     */
    thetaStart: 0,
    /**
     * @type {number}
     */
    thetaLength: Math.PI,

    /**
     * @type {number}
     */
    radius: 1

}, function() {
    this.build();
},
/** @lends clay.geometry.Sphere.prototype */
{
    /**
     * Build sphere geometry
     */
    build: function() {
        var heightSegments = this.heightSegments;
        var widthSegments = this.widthSegments;

        var positionAttr = this.attributes.position;
        var texcoordAttr = this.attributes.texcoord0;
        var normalAttr = this.attributes.normal;

        var vertexCount = (widthSegments + 1) * (heightSegments + 1);
        positionAttr.init(vertexCount);
        texcoordAttr.init(vertexCount);
        normalAttr.init(vertexCount);

        var IndicesCtor = vertexCount > 0xffff ? Uint32Array : Uint16Array;
        var indices = this.indices = new IndicesCtor(widthSegments * heightSegments * 6);

        var x, y, z,
            u, v,
            i, j;

        var radius = this.radius;
        var phiStart = this.phiStart;
        var phiLength = this.phiLength;
        var thetaStart = this.thetaStart;
        var thetaLength = this.thetaLength;
        var radius = this.radius;

        var pos = [];
        var uv = [];
        var offset = 0;
        var divider = 1 / radius;
        for (j = 0; j <= heightSegments; j ++) {
            for (i = 0; i <= widthSegments; i ++) {
                u = i / widthSegments;
                v = j / heightSegments;

                // X axis is inverted so texture can be mapped from left to right
                x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                y = radius * Math.cos(thetaStart + v * thetaLength);
                z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);

                pos[0] = x; pos[1] = y; pos[2] = z;
                uv[0] = u; uv[1] = v;
                positionAttr.set(offset, pos);
                texcoordAttr.set(offset, uv);
                pos[0] *= divider;
                pos[1] *= divider;
                pos[2] *= divider;
                normalAttr.set(offset, pos);
                offset++;
            }
        }

        var i1, i2, i3, i4;

        var len = widthSegments + 1;

        var n = 0;
        for (j = 0; j < heightSegments; j ++) {
            for (i = 0; i < widthSegments; i ++) {
                i2 = j * len + i;
                i1 = (j * len + i + 1);
                i4 = (j + 1) * len + i + 1;
                i3 = (j + 1) * len + i;

                indices[n++] = i1;
                indices[n++] = i2;
                indices[n++] = i4;

                indices[n++] = i2;
                indices[n++] = i3;
                indices[n++] = i4;
            }
        }

        this.boundingBox = new BoundingBox();
        this.boundingBox.max.set(radius, radius, radius);
        this.boundingBox.min.set(-radius, -radius, -radius);
    }
});

export default Sphere;
