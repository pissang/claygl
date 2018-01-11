import Geometry from '../Geometry';

/**
 * @constructor clay.geometry.ParametricSurface
 * @extends clay.Geometry
 * @param {Object} [opt]
 * @param {Object} [generator]
 * @param {Function} generator.x
 * @param {Function} generator.y
 * @param {Function} generator.z
 * @param {Array} [generator.u=[0, 1, 0.05]]
 * @param {Array} [generator.v=[0, 1, 0.05]]
 */
var ParametricSurface = Geometry.extend(
/** @lends clay.geometry.ParametricSurface# */
{
    dynamic: false,
    /**
     * @type {Object}
     */
    generator: null

}, function() {
    this.build();
},
/** @lends clay.geometry.ParametricSurface.prototype */
{
    /**
     * Build parametric surface geometry
     */
    build: function () {
        var generator = this.generator;

        if (!generator || !generator.x || !generator.y || !generator.z) {
            throw new Error('Invalid generator');
        }
        var xFunc = generator.x;
        var yFunc = generator.y;
        var zFunc = generator.z;
        var uRange = generator.u || [0, 1, 0.05];
        var vRange = generator.v || [0, 1, 0.05];

        var uNum = Math.floor((uRange[1] - uRange[0] + uRange[2]) / uRange[2]);
        var vNum = Math.floor((vRange[1] - vRange[0] + vRange[2]) / vRange[2]);

        if (!isFinite(uNum) || !isFinite(vNum)) {
            throw new Error('Infinite generator');
        }

        var vertexNum = uNum * vNum;
        this.attributes.position.init(vertexNum);
        this.attributes.texcoord0.init(vertexNum);

        var pos = [];
        var texcoord = [];
        var nVertex = 0;
        for (var j = 0; j < vNum; j++) {
            for (var i = 0; i < uNum; i++) {
                var u = i * uRange[2] + uRange[0];
                var v = j * vRange[2] + vRange[0];
                pos[0] = xFunc(u, v);
                pos[1] = yFunc(u, v);
                pos[2] = zFunc(u, v);

                texcoord[0] = i / (uNum - 1);
                texcoord[1] = j / (vNum - 1);

                this.attributes.position.set(nVertex, pos);
                this.attributes.texcoord0.set(nVertex, texcoord);
                nVertex++;
            }
        }

        var IndicesCtor = vertexNum > 0xffff ? Uint32Array : Uint16Array;
        var nIndices = (uNum - 1) * (vNum - 1) * 6;
        var indices = this.indices = new IndicesCtor(nIndices);

        var n = 0;
        for (var j = 0; j < vNum - 1; j++) {
            for (var i = 0; i < uNum - 1; i++) {
                var i2 = j * uNum + i;
                var i1 = (j * uNum + i + 1);
                var i4 = (j + 1) * uNum + i + 1;
                var i3 = (j + 1) * uNum + i;

                indices[n++] = i1;
                indices[n++] = i2;
                indices[n++] = i4;

                indices[n++] = i2;
                indices[n++] = i3;
                indices[n++] = i4;
            }
        }

        this.generateVertexNormals();
        this.updateBoundingBox();
    }
});

export default ParametricSurface;
