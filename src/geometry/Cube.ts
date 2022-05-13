import Geometry, { GeometryOpts } from '../Geometry';
import PlaneGeometry from './Plane';
import Matrix4 from '../math/Matrix4';
import Vector3 from '../math/Vector3';
import BoundingBox from '../math/BoundingBox';
import { assign } from '../core/util';

const planeMatrix = new Matrix4();
export interface CubeGeometryOpts extends GeometryOpts {
  widthSegments: number;
  heightSegments: number;
  depthSegments: number;
  inside: boolean;
}

interface CubeGeometry extends CubeGeometryOpts {}

type Face = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

class CubeGeometry extends Geometry {
  widthSegments = 1;
  heightSegments = 1;
  depthSegments = 1;
  inside = false;

  constructor(opts?: Partial<CubeGeometryOpts>) {
    super(opts);
    assign(this, opts);
    this.build();
  }

  /**
   * Build cube geometry
   */
  build() {
    const planes: Record<string, PlaneGeometry> = {
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
      faceNumber += planes[pos].indices!.length;
    }
    for (let k = 0; k < attrList.length; k++) {
      this.attributes[attrList[k]].init(vertexNumber);
    }
    this.indices = new Uint16Array(faceNumber);
    let faceOffset = 0;
    let vertexOffset = 0;
    for (const pos in planes) {
      const plane = planes[pos];
      for (let k = 0; k < attrList.length; k++) {
        const attrName = attrList[k];
        const attrArray = plane.attributes[attrName].value!;
        const attrSize = plane.attributes[attrName].size;
        const isNormal = attrName === 'normal';
        for (let i = 0; i < attrArray.length; i++) {
          let value = attrArray[i];
          if (this.inside && isNormal) {
            value = -value;
          }
          this.attributes[attrName].value![i + attrSize * vertexOffset] = value;
        }
      }
      const planeIndices = plane.indices!;
      const len = planeIndices.length;
      for (let i = 0; i < planeIndices.length; i++) {
        this.indices[i + faceOffset] = vertexOffset + planeIndices[this.inside ? len - i - 1 : i];
      }
      faceOffset += planeIndices.length;
      vertexOffset += plane.vertexCount;
    }

    this.boundingBox = new BoundingBox();
    this.boundingBox.max.set(1, 1, 1);
    this.boundingBox.min.set(-1, -1, -1);
  }
}
function createPlane(pos: Face, widthSegments: number, heightSegments: number) {
  planeMatrix.identity();

  const plane = new PlaneGeometry({
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

export default CubeGeometry;
