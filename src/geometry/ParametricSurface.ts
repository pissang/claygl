// @ts-nocheck
import Geometry, { GeometryOpts } from '../Geometry';

interface SurfaceGenerator {
  u?: [number, number, number]; // [start, end, step]
  v?: [number, number, number]; // [start, end, step]
  x: (u: number, v: number) => number;
  y: (u: number, v: number) => number;
  z: (u: number, v: number) => number;
}

interface ParametricSurfaceGeometryOpts extends GeometryOpts {
  generator: SurfaceGenerator;
}

interface ParametricSurfaceGeometry extends ParametricSurfaceGeometryOpts {}
class ParametricSurfaceGeometry extends Geometry {
  generator: SurfaceGenerator;

  constructor(opts?: Partial<ParametricSurfaceGeometryOpts>) {
    opts = opts || {};
    super(opts);
    Object.assign(this, opts);
    this.build();
  }

  /**
   * Build parametric surface geometry
   */
  build() {
    const generator = this.generator;

    if (!generator || !generator.x || !generator.y || !generator.z) {
      throw new Error('Invalid generator');
    }
    const xFunc = generator.x;
    const yFunc = generator.y;
    const zFunc = generator.z;
    const uRange = generator.u || [0, 1, 0.05];
    const vRange = generator.v || [0, 1, 0.05];

    const uNum = Math.floor((uRange[1] - uRange[0] + uRange[2]) / uRange[2]);
    const vNum = Math.floor((vRange[1] - vRange[0] + vRange[2]) / vRange[2]);

    if (!isFinite(uNum) || !isFinite(vNum)) {
      throw new Error('Infinite generator');
    }

    const vertexNum = uNum * vNum;
    this.attributes.position.init(vertexNum);
    this.attributes.texcoord0.init(vertexNum);

    const pos = [];
    const texcoord = [];
    let nVertex = 0;
    for (let j = 0; j < vNum; j++) {
      for (let i = 0; i < uNum; i++) {
        const u = i * uRange[2] + uRange[0];
        const v = j * vRange[2] + vRange[0];
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

    const IndicesCtor = vertexNum > 0xffff ? Uint32Array : Uint16Array;
    const nIndices = (uNum - 1) * (vNum - 1) * 6;
    const indices = (this.indices = new IndicesCtor(nIndices));

    let n = 0;
    for (let j = 0; j < vNum - 1; j++) {
      for (let i = 0; i < uNum - 1; i++) {
        const i2 = j * uNum + i;
        const i1 = j * uNum + i + 1;
        const i4 = (j + 1) * uNum + i + 1;
        const i3 = (j + 1) * uNum + i;

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
}

export default ParametricSurfaceGeometry;
