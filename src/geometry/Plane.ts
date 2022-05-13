import { assign } from '../core/util';
import Geometry, { GeometryOpts } from '../Geometry';
import BoundingBox from '../math/BoundingBox';

export interface PlaneGeometryOpts extends GeometryOpts {
  widthSegments: number;
  heightSegments: number;
}

interface PlaneGeometry extends PlaneGeometryOpts {}
class PlaneGeometry extends Geometry {
  widthSegments = 1;
  heightSegments = 1;

  constructor(opts?: Partial<PlaneGeometryOpts>) {
    super(opts);
    assign(this, opts);
    this.build();
  }
  /**
   * Build plane geometry
   */
  build() {
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
export default PlaneGeometry;
