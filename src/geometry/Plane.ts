// @ts-nocheck
import Geometry from '../Geometry';
import BoundingBox from '../math/BoundingBox';

/**
 * @constructor clay.geometry.Plane
 * @extends clay.Geometry
 * @param {Object} [opt]
 * @param {number} [opt.widthSegments]
 * @param {number} [opt.heightSegments]
 */
const Plane = Geometry.extend(
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
  },
  function () {
    this.build();
  },
  /** @lends clay.geometry.Plane.prototype */
  {
    /**
     * Build plane geometry
     */
    build: function () {
      const heightSegments = this.heightSegments;
      const widthSegments = this.widthSegments;
      const attributes = this.attributes;
      const positions = [];
      const texcoords = [];
      const normals = [];
      const faces = [];

      for (let y = 0; y <= heightSegments; y++) {
        const t = y / heightSegments;
        for (let x = 0; x <= widthSegments; x++) {
          const s = x / widthSegments;

          positions.push([2 * s - 1, 2 * t - 1, 0]);
          if (texcoords) {
            texcoords.push([s, t]);
          }
          if (normals) {
            normals.push([0, 0, 1]);
          }
          if (x < widthSegments && y < heightSegments) {
            const i = x + y * (widthSegments + 1);
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
  }
);

export default Plane;
