import { assign } from '../core/util';
import Geometry, { GeometryOpts } from '../Geometry';
import ConeGeometry from './Cone';

interface CylinderGeometryOpts extends GeometryOpts {
  radius: number;
  height: number;
  capSegments: number;
  heightSegments: number;
}

interface CylinderGeometry extends CylinderGeometryOpts {}
class CylinderGeometry extends Geometry {
  radius = 1;
  height = 2;
  capSegments = 50;
  heightSegments = 1;

  constructor(opts?: Partial<CylinderGeometryOpts>) {
    super(opts);
    assign(this, opts);
    this.build();
  }

  build() {
    const cone = new ConeGeometry({
      topRadius: this.radius,
      bottomRadius: this.radius,
      capSegments: this.capSegments,
      heightSegments: this.heightSegments,
      height: this.height
    });

    this.attributes.position.value = cone.attributes.position.value;
    this.attributes.normal.value = cone.attributes.normal.value;
    this.attributes.texcoord0.value = cone.attributes.texcoord0.value;
    this.indices = cone.indices;

    this.boundingBox = cone.boundingBox;
  }
}

export default CylinderGeometry;
