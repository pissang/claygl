import Geometry, { GeometryOpts } from '../Geometry';
import BoundingBox from '../math/BoundingBox';
import * as vec3 from '../glmatrix/vec3';
import * as vec2 from '../glmatrix/vec2';
import { assign } from '../core/util';

export interface ConeGeometryOpts extends GeometryOpts {
  topRadius: number;
  bottomRadius: number;
  height: number;
  capSegments: number;
  heightSegments: number;
}

interface ConeGeometry extends ConeGeometryOpts {}
class ConeGeometry extends Geometry {
  dynamic = false;

  // TODO Not save properties here.
  topRadius = 0;
  bottomRadius = 1;
  height = 2;
  capSegments = 20;
  heightSegments = 1;

  constructor(opts?: Partial<ConeGeometryOpts>) {
    super(opts);
    assign(this, opts);
    this.build();
  }

  build() {
    const positions = [];
    const texcoords = [];
    const faces = [];
    positions.length = 0;
    texcoords.length = 0;
    faces.length = 0;
    // Top cap
    const capSegRadial = (Math.PI * 2) / this.capSegments;

    const topCap = [];
    const bottomCap = [];

    const r1 = this.topRadius;
    const r2 = this.bottomRadius;
    const y = this.height / 2;

    const c1 = vec3.fromValues(0, y, 0);
    const c2 = vec3.fromValues(0, -y, 0);
    for (let i = 0; i < this.capSegments; i++) {
      const theta = i * capSegRadial;
      let x = r1 * Math.sin(theta);
      let z = r1 * Math.cos(theta);
      topCap.push(vec3.fromValues(x, y, z));

      x = r2 * Math.sin(theta);
      z = r2 * Math.cos(theta);
      bottomCap.push(vec3.fromValues(x, -y, z));
    }

    // Build top cap
    positions.push(c1);
    // FIXME
    texcoords.push(vec2.fromValues(0, 1));
    const n = this.capSegments;
    for (let i = 0; i < n; i++) {
      positions.push(topCap[i]);
      // FIXME
      texcoords.push(vec2.fromValues(i / n, 0));
      faces.push([0, i + 1, ((i + 1) % n) + 1]);
    }

    // Build bottom cap
    let offset = positions.length;
    positions.push(c2);
    texcoords.push(vec2.fromValues(0, 1));
    for (let i = 0; i < n; i++) {
      positions.push(bottomCap[i]);
      // FIXME
      texcoords.push(vec2.fromValues(i / n, 0));
      faces.push([offset, offset + (((i + 1) % n) + 1), offset + i + 1]);
    }

    // Build side
    offset = positions.length;
    const n2 = this.heightSegments;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n2 + 1; j++) {
        const v = j / n2;
        positions.push(vec3.lerp(vec3.create(), topCap[i], bottomCap[i], v));
        texcoords.push(vec2.fromValues(i / n, v));
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n2; j++) {
        const i1 = i * (n2 + 1) + j;
        const i2 = ((i + 1) % n) * (n2 + 1) + j;
        const i3 = ((i + 1) % n) * (n2 + 1) + j + 1;
        const i4 = i * (n2 + 1) + j + 1;
        faces.push([offset + i2, offset + i1, offset + i4]);
        faces.push([offset + i4, offset + i3, offset + i2]);
      }
    }

    this.attributes.position.fromArray(positions);
    this.attributes.texcoord0.fromArray(texcoords);

    this.initIndicesFromArray(faces);

    this.generateVertexNormals();

    this.boundingBox = new BoundingBox();
    const r = Math.max(this.topRadius, this.bottomRadius);
    this.boundingBox.min.set(-r, -this.height / 2, -r);
    this.boundingBox.max.set(r, this.height / 2, r);
  }
}

export default ConeGeometry;
