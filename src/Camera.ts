import ClayNode, { ClayNodeOpts } from './Node';
import Frustum from './math/Frustum';
import Matrix4 from './math/Matrix4';
import Ray from './math/Ray';

import * as vec4 from './glmatrix/vec4';
import * as vec3 from './glmatrix/vec3';
import Vector2 from './math/Vector2';

export interface CameraOpts extends ClayNodeOpts {}

const v4Arr = vec4.create();

interface Camera extends ClayNodeOpts {}
class Camera extends ClayNode {
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

  update() {
    super.update.call(this);
    Matrix4.invert(this.viewMatrix, this.worldTransform);

    this.updateProjectionMatrix();
    Matrix4.invert(this.invProjectionMatrix, this.projectionMatrix);

    this.frustum.setFromProjection(this.projectionMatrix);
  }

  /**
   * Set camera view matrix
   */
  setViewMatrix(viewMatrix: Matrix4) {
    Matrix4.copy(this.viewMatrix, viewMatrix);
    Matrix4.invert(this.worldTransform, viewMatrix);
    this.decomposeWorldTransform();
  }

  /**
   * Decompose camera projection matrix
   */
  decomposeProjectionMatrix() {}

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
  updateProjectionMatrix() {}

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
}

export default Camera;
