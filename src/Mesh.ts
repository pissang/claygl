import Renderable, { RenderableOpts } from './Renderable';
import glenum from './core/glenum';
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

  static POINTS = glenum.POINTS;
  static LINES = glenum.LINES;
  static LINE_LOOP = glenum.LINE_LOOP;
  static LINE_STRIP = glenum.LINE_STRIP;
  static TRIANGLES = glenum.TRIANGLES;
  static TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
  static TRIANGLE_FAN = glenum.TRIANGLE_FAN;

  static BACK = glenum.BACK;
  static FRONT = glenum.FRONT;
  static FRONT_AND_BACK = glenum.FRONT_AND_BACK;
  static CW = glenum.CW;
  static CCW = glenum.CCW;
}
export default Mesh;
