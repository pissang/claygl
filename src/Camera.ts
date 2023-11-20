import ClayNode, { ClayNodeOpts } from './Node';
import Frustum from './math/Frustum';
import Matrix4 from './math/Matrix4';
import Ray from './math/Ray';

import * as vec4 from './glmatrix/vec4';
import * as vec3 from './glmatrix/vec3';
import Vector2 from './math/Vector2';

export interface CameraOpts extends ClayNodeOpts {}

const v4Arr = vec4.create();

type CameraProjectionTypes = 'perspective' | 'orthographic';
export class CameraPerspectiveProjection {
  type: 'perspective' = 'perspective';
  /**
   * Vertical field of view in degrees
   */
  fov = 50;
  /**
   * Aspect ratio, typically viewport width / height
   */
  aspect = 1;
  /**
   * Near bound of the frustum
   */
  near = 0.1;
  /**
   * Far bound of the frustum
   */
  far = 2000;
}

export class CameraOrthographicProjection {
  type: 'orthographic' = 'orthographic';
  left = -1;
  right = 1;
  near = -1;
  far = 1;
  top = 1;
  bottom = -1;
}

type Projections = {
  orthographic: CameraOrthographicProjection;
  perspective: CameraPerspectiveProjection;
};

class Camera<T extends CameraProjectionTypes = CameraProjectionTypes> extends ClayNode {
  /**
   * Camera projection
   */
  projection: Projections[T];
  /**
   * Camera projection matrix
   */
  projectionMatrix = new Matrix4();

  /**
   * Inverse of camera projection matrix
   */
  invProjectionMatrix = new Matrix4();
  /**
   * View matrix, equal to inverse of camera's world matrix
   */
  viewMatrix = new Matrix4();
  /**
   * Camera frustum in view space
   */
  frustum = new Frustum();

  /**
   * Jitter offset. In pixels.
   */
  offset = new Vector2();

  constructor(type: CameraProjectionTypes = 'perspective') {
    super();
    // TODO
    this.projection = (
      type === 'perspective'
        ? new CameraPerspectiveProjection()
        : new CameraOrthographicProjection()
    ) as Projections[T];
  }

  update() {
    super.update.call(this);
    Matrix4.invert(this.viewMatrix, this.worldTransform);

    this.updateProjectionMatrix();
    const projectionMatrix = this.projectionMatrix;
    const translationMat = new Matrix4();
    const offset = this.offset;
    translationMat.array[12] = offset.x;
    translationMat.array[13] = offset.y;
    Matrix4.mul(projectionMatrix, translationMat, projectionMatrix);
    Matrix4.invert(this.invProjectionMatrix, projectionMatrix);

    this.frustum.setFromProjection(projectionMatrix);
  }

  updateOffset?: (width: number, height: number, dpr: number) => void;

  /**
   * Set camera view matrix
   */
  setViewMatrix(viewMatrix: Matrix4) {
    Matrix4.copy(this.viewMatrix, viewMatrix);
    Matrix4.invert(this.worldTransform, viewMatrix);
    this.decomposeWorldTransform();
  }

  /**
   * Set camera projection matrix
   * @param {clay.Matrix4} projectionMatrix
   */
  setProjectionMatrix(projectionMatrix: Matrix4) {
    Matrix4.copy(this.projectionMatrix, projectionMatrix);
    Matrix4.invert(this.invProjectionMatrix, projectionMatrix);
    this.decomposeProjectionMatrix();
  }
  /**
   * Update projection matrix, called after update
   */
  updateProjectionMatrix() {
    const proj = this.projection;
    if (proj.type === 'orthographic') {
      this.projectionMatrix.ortho(
        proj.left,
        proj.right,
        proj.bottom,
        proj.top,
        proj.near,
        proj.far
      );
    } else {
      const rad = (proj.fov / 180) * Math.PI;
      this.projectionMatrix.perspective(rad, proj.aspect, proj.near, proj.far);
    }
  }

  /**
   * Decompose camera projection matrix
   */
  decomposeProjectionMatrix() {
    const proj = this.projection;
    const m = this.projectionMatrix.array;
    if (proj.type === 'orthographic') {
      proj.left = (-1 - m[12]) / m[0];
      proj.right = (1 - m[12]) / m[0];
      proj.top = (1 - m[13]) / m[5];
      proj.bottom = (-1 - m[13]) / m[5];
      proj.near = -(-1 - m[14]) / m[10];
      proj.far = -(1 - m[14]) / m[10];
    } else {
      const rad = Math.atan(1 / m[5]) * 2;
      proj.fov = (rad / Math.PI) * 180;
      proj.aspect = m[5] / m[0];
      proj.near = m[14] / (m[10] - 1);
      proj.far = m[14] / (m[10] + 1);
    }
  }
  /**
   * Cast a picking ray from camera near plane to far plane
   * @function
   * @param {clay.Vector2} ndc
   * @param {clay.Ray} [out]
   * @return {clay.Ray}
   */
  castRay(ndc: Vector2, out?: Ray) {
    const ray = out !== undefined ? out : new Ray();
    const x = ndc.array[0];
    const y = ndc.array[1];
    vec4.set(v4Arr, x, y, -1, 1);
    vec4.transformMat4(v4Arr, v4Arr, this.invProjectionMatrix.array);
    vec4.transformMat4(v4Arr, v4Arr, this.worldTransform.array);
    vec3.scale(ray.origin.array, v4Arr as unknown as vec3.Vec3Array, 1 / v4Arr[3]);

    vec4.set(v4Arr, x, y, 1, 1);
    vec4.transformMat4(v4Arr, v4Arr, this.invProjectionMatrix.array);
    vec4.transformMat4(v4Arr, v4Arr, this.worldTransform.array);
    vec3.scale(
      v4Arr as unknown as vec3.Vec3Array,
      v4Arr as unknown as vec3.Vec3Array,
      1 / v4Arr[3]
    );
    vec3.sub(ray.direction.array, v4Arr as unknown as vec3.Vec3Array, ray.origin.array);

    vec3.normalize(ray.direction.array, ray.direction.array);

    return ray;
  }

  clone() {
    const camera = super.clone.call(this);
    camera.projection = {
      ...this.projection
    };

    return camera;
  }
}

export default Camera;
