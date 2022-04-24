import Plane from './Plane';
import * as vec3 from '../glmatrix/vec3';
import Matrix4 from './Matrix4';
import BoundingBox from './BoundingBox';

const mathMin = Math.min;
const mathMax = Math.max;
const tmpVec3 = vec3.create();
/**
 * @constructor
 * @alias clay.Frustum
 */
class Frustum {
  planes: Plane[] = [];
  vertices: vec3.Vec3Array[] = [];

  boundingBox = new BoundingBox();

  constructor() {
    for (let i = 0; i < 6; i++) {
      this.planes.push(new Plane());
    }
    for (let i = 0; i < 8; i++) {
      this.vertices[i] = vec3.fromValues(0, 0, 0);
    }
  }
  // http://web.archive.org/web/20120531231005/http://crazyjoke.free.fr/doc/3D/plane%20extraction.pdf
  /**
   * Set frustum from a projection matrix
   * @param projectionMatrix
   */
  setFromProjection(projectionMatrix: Matrix4) {
    const planes = this.planes;
    const m = projectionMatrix.array;
    const m0 = m[0],
      m1 = m[1],
      m2 = m[2],
      m3 = m[3];
    const m4 = m[4],
      m5 = m[5],
      m6 = m[6],
      m7 = m[7];
    const m8 = m[8],
      m9 = m[9],
      m10 = m[10],
      m11 = m[11];
    const m12 = m[12],
      m13 = m[13],
      m14 = m[14],
      m15 = m[15];

    // Update planes
    vec3.set(planes[0].normal.array, m3 - m0, m7 - m4, m11 - m8);
    planes[0].distance = -(m15 - m12);
    planes[0].normalize();

    vec3.set(planes[1].normal.array, m3 + m0, m7 + m4, m11 + m8);
    planes[1].distance = -(m15 + m12);
    planes[1].normalize();

    vec3.set(planes[2].normal.array, m3 + m1, m7 + m5, m11 + m9);
    planes[2].distance = -(m15 + m13);
    planes[2].normalize();

    vec3.set(planes[3].normal.array, m3 - m1, m7 - m5, m11 - m9);
    planes[3].distance = -(m15 - m13);
    planes[3].normalize();

    vec3.set(planes[4].normal.array, m3 - m2, m7 - m6, m11 - m10);
    planes[4].distance = -(m15 - m14);
    planes[4].normalize();

    vec3.set(planes[5].normal.array, m3 + m2, m7 + m6, m11 + m10);
    planes[5].distance = -(m15 + m14);
    planes[5].normalize();

    // Perspective projection
    const boundingBox = this.boundingBox;
    const vertices = this.vertices;
    if (m15 === 0) {
      const aspect = m5 / m0;
      const zNear = -m14 / (m10 - 1);
      const zFar = -m14 / (m10 + 1);
      const farY = -zFar / m5;
      const nearY = -zNear / m5;
      // Update bounding box
      boundingBox.min.set(-farY * aspect, -farY, zFar);
      boundingBox.max.set(farY * aspect, farY, zNear);
      // update vertices
      //--- min z
      // min x
      vec3.set(vertices[0], -farY * aspect, -farY, zFar);
      vec3.set(vertices[1], -farY * aspect, farY, zFar);
      // max x
      vec3.set(vertices[2], farY * aspect, -farY, zFar);
      vec3.set(vertices[3], farY * aspect, farY, zFar);
      //-- max z
      vec3.set(vertices[4], -nearY * aspect, -nearY, zNear);
      vec3.set(vertices[5], -nearY * aspect, nearY, zNear);
      vec3.set(vertices[6], nearY * aspect, -nearY, zNear);
      vec3.set(vertices[7], nearY * aspect, nearY, zNear);
    } else {
      // Orthographic projection
      const left = (-1 - m12) / m0;
      const right = (1 - m12) / m0;
      const top = (1 - m13) / m5;
      const bottom = (-1 - m13) / m5;
      const near = (-1 - m14) / m10;
      const far = (1 - m14) / m10;

      boundingBox.min.set(Math.min(left, right), Math.min(bottom, top), Math.min(far, near));
      boundingBox.max.set(Math.max(right, left), Math.max(top, bottom), Math.max(near, far));

      const min = boundingBox.min.array;
      const max = boundingBox.max.array;
      //--- min z
      // min x
      vec3.set(vertices[0], min[0], min[1], min[2]);
      vec3.set(vertices[1], min[0], max[1], min[2]);
      // max x
      vec3.set(vertices[2], max[0], min[1], min[2]);
      vec3.set(vertices[3], max[0], max[1], min[2]);
      //-- max z
      vec3.set(vertices[4], min[0], min[1], max[2]);
      vec3.set(vertices[5], min[0], max[1], max[2]);
      vec3.set(vertices[6], max[0], min[1], max[2]);
      vec3.set(vertices[7], max[0], max[1], max[2]);
    }
  }

  /**
   * Apply a affine transform matrix and set to the given bounding box
   * @function
   * @param {clay.BoundingBox}
   * @param {clay.Matrix4}
   * @return {clay.BoundingBox}
   */
  getTransformedBoundingBox(bbox: BoundingBox, matrix: Matrix4) {
    const vertices = this.vertices;

    const m4 = matrix.array;
    const min = bbox.min;
    const max = bbox.max;
    const minArr = min.array;
    const maxArr = max.array;
    let v = vertices[0];
    vec3.transformMat4(tmpVec3, v, m4);
    vec3.copy(minArr, tmpVec3);
    vec3.copy(maxArr, tmpVec3);

    for (let i = 1; i < 8; i++) {
      v = vertices[i];
      vec3.transformMat4(tmpVec3, v, m4);

      minArr[0] = mathMin(tmpVec3[0], minArr[0]);
      minArr[1] = mathMin(tmpVec3[1], minArr[1]);
      minArr[2] = mathMin(tmpVec3[2], minArr[2]);

      maxArr[0] = mathMax(tmpVec3[0], maxArr[0]);
      maxArr[1] = mathMax(tmpVec3[1], maxArr[1]);
      maxArr[2] = mathMax(tmpVec3[2], maxArr[2]);
    }

    return bbox;
  }
}

export default Frustum;
