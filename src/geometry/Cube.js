import Geometry from '../Geometry';
import Plane from './Plane';
import Matrix4 from '../math/Matrix4';
import Vector3 from '../math/Vector3';
import BoundingBox from '../math/BoundingBox';
import vendor from '../core/vendor';

var planeMatrix = new Matrix4();

/**
 * @constructor clay.geometry.Cube
 * @extends clay.Geometry
 * @param {Object} [opt]
 * @param {number} [opt.widthSegments]
 * @param {number} [opt.heightSegments]
 * @param {number} [opt.depthSegments]
 * @param {boolean} [opt.inside]
 */
var Cube = Geometry.extend(
/**@lends clay.geometry.Cube# */
{
    dynamic: false,
    /**
     * @type {number}
     */
    widthSegments: 1,
    /**
     * @type {number}
     */
    heightSegments: 1,
    /**
     * @type {number}
     */
    depthSegments: 1,
    /**
     * @type {boolean}
     */
    inside: false
}, function() {
    this.build();
},
/** @lends clay.geometry.Cube.prototype */
{
    /**
     * Build cube geometry
     */
    build: function() {

        var planes = {
            'px': createPlane('px', this.depthSegments, this.heightSegments),
            'nx': createPlane('nx', this.depthSegments, this.heightSegments),
            'py': createPlane('py', this.widthSegments, this.depthSegments),
            'ny': createPlane('ny', this.widthSegments, this.depthSegments),
            'pz': createPlane('pz', this.widthSegments, this.heightSegments),
            'nz': createPlane('nz', this.widthSegments, this.heightSegments),
        };

        var attrList = ['position', 'texcoord0', 'normal'];
        var vertexNumber = 0;
        var faceNumber = 0;
        for (var pos in planes) {
            vertexNumber += planes[pos].vertexCount;
            faceNumber += planes[pos].indices.length;
        }
        for (var k = 0; k < attrList.length; k++) {
            this.attributes[attrList[k]].init(vertexNumber);
        }
        this.indices = new vendor.Uint16Array(faceNumber);
        var faceOffset = 0;
        var vertexOffset = 0;
        for (var pos in planes) {
            var plane = planes[pos];
            for (var k = 0; k < attrList.length; k++) {
                var attrName = attrList[k];
                var attrArray = plane.attributes[attrName].value;
                var attrSize = plane.attributes[attrName].size;
                var isNormal = attrName === 'normal';
                for (var i = 0; i < attrArray.length; i++) {
                    var value = attrArray[i];
                    if (this.inside && isNormal) {
                        value = -value;
                    }
                    this.attributes[attrName].value[i + attrSize * vertexOffset] = value;
                }
            }
            var len = plane.indices.length;
            for (var i = 0; i < plane.indices.length; i++) {
                this.indices[i + faceOffset] = vertexOffset + plane.indices[this.inside ? (len - i - 1) : i];
            }
            faceOffset += plane.indices.length;
            vertexOffset += plane.vertexCount;
        }

        this.boundingBox = new BoundingBox();
        this.boundingBox.max.set(1, 1, 1);
        this.boundingBox.min.set(-1, -1, -1);
    }
});

function createPlane(pos, widthSegments, heightSegments) {

    planeMatrix.identity();

    var plane = new Plane({
        widthSegments: widthSegments,
        heightSegments: heightSegments
    });

    switch(pos) {
        case 'px':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.POSITIVE_X);
            Matrix4.rotateY(planeMatrix, planeMatrix, Math.PI / 2);
            break;
        case 'nx':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.NEGATIVE_X);
            Matrix4.rotateY(planeMatrix, planeMatrix, -Math.PI / 2);
            break;
        case 'py':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.POSITIVE_Y);
            Matrix4.rotateX(planeMatrix, planeMatrix, -Math.PI / 2);
            break;
        case 'ny':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.NEGATIVE_Y);
            Matrix4.rotateX(planeMatrix, planeMatrix, Math.PI / 2);
            break;
        case 'pz':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.POSITIVE_Z);
            break;
        case 'nz':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.NEGATIVE_Z);
            Matrix4.rotateY(planeMatrix, planeMatrix, Math.PI);
            break;
    }
    plane.applyTransform(planeMatrix);
    return plane;
}

export default Cube;
