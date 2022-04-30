import Geometry, { GeometryOpts } from '../Geometry';
import { vec3 } from '../glmatrix';
import BoundingBox from '../math/BoundingBox';

interface SphereGeometryOpts extends GeometryOpts {
  widthSegments: number;
  heightSegments: number;

  phiStart: number;
  phiLength: number;

  thetaStart: number;
  thetaLength: number;

  radius: number;
}

interface SphereGeometry extends SphereGeometryOpts {}
class SphereGeometry extends Geometry {
  widthSegments = 40;
  heightSegments = 20;
  phiStart = 0;
  phiLength = Math.PI * 2;
  thetaStart = 0;
  thetaLength = Math.PI;
  radius = 1;

  constructor(opts?: Partial<SphereGeometryOpts>) {
    super(opts);
    Object.assign(this, opts);
    this.build();
  }
  build() {
    const heightSegments = this.heightSegments;
    const widthSegments = this.widthSegments;

    const positionAttr = this.attributes.position;
    const texcoordAttr = this.attributes.texcoord0;
    const normalAttr = this.attributes.normal;

    const vertexCount = (widthSegments + 1) * (heightSegments + 1);
    positionAttr.init(vertexCount);
    texcoordAttr.init(vertexCount);
    normalAttr.init(vertexCount);

    const IndicesCtor = vertexCount > 0xffff ? Uint32Array : Uint16Array;
    const indices = (this.indices = new IndicesCtor(widthSegments * heightSegments * 6));

    let x, y, z, u, v, i, j;

    const radius = this.radius;
    const phiStart = this.phiStart;
    const phiLength = this.phiLength;
    const thetaStart = this.thetaStart;
    const thetaLength = this.thetaLength;

    const pos = vec3.create();
    const uv = vec3.create();
    let offset = 0;
    const divider = 1 / radius;
    for (j = 0; j <= heightSegments; j++) {
      for (i = 0; i <= widthSegments; i++) {
        u = i / widthSegments;
        v = j / heightSegments;

        // X axis is inverted so texture can be mapped from left to right
        x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        y = radius * Math.cos(thetaStart + v * thetaLength);
        z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);

        pos[0] = x;
        pos[1] = y;
        pos[2] = z;
        uv[0] = u;
        uv[1] = v;
        positionAttr.set(offset, pos);
        texcoordAttr.set(offset, uv);
        pos[0] *= divider;
        pos[1] *= divider;
        pos[2] *= divider;
        normalAttr.set(offset, pos);
        offset++;
      }
    }

    let i1, i2, i3, i4;

    const len = widthSegments + 1;

    let n = 0;
    for (j = 0; j < heightSegments; j++) {
      for (i = 0; i < widthSegments; i++) {
        i2 = j * len + i;
        i1 = j * len + i + 1;
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
}

export default SphereGeometry;
