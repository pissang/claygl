// @ts-nocheck
import Geometry from '../Geometry';
import Plane from './Plane';
import Matrix4 from '../math/Matrix4';
import Vector3 from '../math/Vector3';
import BoundingBox from '../math/BoundingBox';
import vendor from '../core/vendor';

const planeMatrix = new Matrix4();

/**
 * @constructor clay.geometry.Cube
 * @extends clay.Geometry
 * @param {Object} [opt]
 * @param {number} [opt.widthSegments]
 * @param {number} [opt.heightSegments]
 * @param {number} [opt.depthSegments]
 * @param {boolean} [opt.inside]
 */
const Cube = Geometry.extend(
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
  },
  function () {
    this.build();
  },
  /** @lends clay.geometry.Cube.prototype */
  {
    /**
     * Build cube geometry
     */
    build: function () {
      const planes = {
        px: createPlane('px', this.depthSegments, this.heightSegments),
        nx: createPlane('nx', this.depthSegments, this.heightSegments),
        py: createPlane('py', this.widthSegments, this.depthSegments),
        ny: createPlane('ny', this.widthSegments, this.depthSegments),
        pz: createPlane('pz', this.widthSegments, this.heightSegments),
        nz: createPlane('nz', this.widthSegments, this.heightSegments)
      };

      const attrList = ['position', 'texcoord0', 'normal'];
      let vertexNumber = 0;
      let faceNumber = 0;
      for (const pos in planes) {
        vertexNumber += planes[pos].vertexCount;
        faceNumber += planes[pos].indices.length;
      }
      for (let k = 0; k < attrList.length; k++) {
        this.attributes[attrList[k]].init(vertexNumber);
      }
      this.indices = new vendor.Uint16Array(faceNumber);
      let faceOffset = 0;
      let vertexOffset = 0;
      for (const pos in planes) {
        const plane = planes[pos];
        for (let k = 0; k < attrList.length; k++) {
          const attrName = attrList[k];
          const attrArray = plane.attributes[attrName].value;
          const attrSize = plane.attributes[attrName].size;
          const isNormal = attrName === 'normal';
          for (let i = 0; i < attrArray.length; i++) {
            let value = attrArray[i];
            if (this.inside && isNormal) {
              value = -value;
            }
            this.attributes[attrName].value[i + attrSize * vertexOffset] = value;
          }
        }
        const len = plane.indices.length;
        for (let i = 0; i < plane.indices.length; i++) {
          this.indices[i + faceOffset] =
            vertexOffset + plane.indices[this.inside ? len - i - 1 : i];
        }
        faceOffset += plane.indices.length;
        vertexOffset += plane.vertexCount;
      }

      this.boundingBox = new BoundingBox();
      this.boundingBox.max.set(1, 1, 1);
      this.boundingBox.min.set(-1, -1, -1);
    }
  }
);

function createPlane(pos, widthSegments, heightSegments) {
  planeMatrix.identity();

  const plane = new Plane({
    widthSegments: widthSegments,
    heightSegments: heightSegments
  });

  switch (pos) {
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
