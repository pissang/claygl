import Renderable, { RenderableOpts } from './Renderable';
import * as constants from './core/constants';
import { optional } from './core/util';
import type Skeleton from './Skeleton';
import type Matrix4 from './math/Matrix4';
import type BoundingBox from './math/BoundingBox';

export interface MeshOpts extends RenderableOpts {
  /**
   * Used when it is a skinned mesh
   */
  skeleton: Skeleton;
  /**
   * Joints indices Meshes can share the one skeleton instance and each mesh can use one part of joints. Joints indices indicate the index of joint in the skeleton instance
   */
  joints: number[];
}

interface Mesh extends MeshOpts {}
class Mesh extends Renderable {
  /**
   * Offset matrix used for multiple skinned mesh clone sharing one skeleton
   */
  offsetMatrix?: Matrix4;

  constructor(opts?: Partial<MeshOpts>) {
    super(opts);
    opts = opts || {};
    if (opts.skeleton) {
      this.skeleton = opts.skeleton;
    }
    this.joints = optional(opts.joints, []);
  }
  isInstancedMesh(): boolean {
    return false;
  }

  isSkinnedMesh(): boolean {
    return !!(this.skeleton && this.joints && this.joints.length > 0);
  }

  clone() {
    const mesh = Renderable.prototype.clone.call(this);
    mesh.skeleton = this.skeleton;
    if (this.joints) {
      mesh.joints = this.joints.slice();
    }
    return mesh;
  }

  static POINTS = constants.POINTS;
  static LINES = constants.LINES;
  static LINE_LOOP = constants.LINE_LOOP;
  static LINE_STRIP = constants.LINE_STRIP;
  static TRIANGLES = constants.TRIANGLES;
  static TRIANGLE_STRIP = constants.TRIANGLE_STRIP;
  static TRIANGLE_FAN = constants.TRIANGLE_FAN;

  static BACK = constants.BACK;
  static FRONT = constants.FRONT;
  static FRONT_AND_BACK = constants.FRONT_AND_BACK;
  static CW = constants.CW;
  static CCW = constants.CCW;
}
export default Mesh;
