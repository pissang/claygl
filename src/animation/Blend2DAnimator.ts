// 2D Blend clip of blend tree
// http://docs.unity3d.com/Documentation/Manual/2DBlending.html
import Vector2 from '../math/Vector2';
import delaunay from '../util/delaunay';
import { BlendAnimator, BlendAnimatorOpts, BlendAnimatorTarget } from './BlendAnimator';

interface Blend2DAnimatorInput {
  position: Vector2;
  offset: number;
  animator: BlendAnimatorTarget;
}
interface Blend2DAnimatorOpts extends BlendAnimatorOpts {
  output: BlendAnimatorTarget;
  inputs: Blend2DAnimatorInput[];
  loop?: boolean;
  playbackRatio?: number;
}

interface Triangle {
  indices: number[];
  vertices: number[][];
}
/**
 * 1d blending node in animation blend tree.
 * output clip must have blend1D and copy method
 */
class Blend2DAnimator extends BlendAnimator {
  position = new Vector2();

  protected _output?: BlendAnimatorTarget;
  protected _inputs: Blend2DAnimatorInput[];

  private _cacheTriangle?: Triangle;
  private _triangles?: Triangle[];

  constructor(opts?: Partial<Blend2DAnimatorOpts>) {
    super();
    opts = opts || {};

    this._inputs = opts.inputs || [];
    this._output = opts.output;

    this._updateTriangles();
  }

  addInput(position: Vector2, inputAnimator: BlendAnimatorTarget, offset: number) {
    const obj: Blend2DAnimatorInput = {
      position,
      animator: inputAnimator,
      offset: offset || 0
    };

    this._inputs.push(obj);
    this._updateTriangles();

    return obj;
  }

  setOutput(output: BlendAnimatorTarget) {
    this._output = output;
  }

  setTime(time: number) {
    const res = this._findTriangle(this.position);
    if (!res) {
      return;
    }
    // In Barycentric
    const a = res[1] as number; // Percent of clip2
    const b = res[2] as number; // Percent of clip3

    const tri = res[0] as Triangle;

    const inputs = this._inputs;

    const in1 = inputs[tri.indices[0]];
    const in2 = inputs[tri.indices[1]];
    const in3 = inputs[tri.indices[2]];
    const anim1 = in1.animator;
    const anim2 = in2.animator;
    const anim3 = in3.animator;

    anim1.setTime((time + in1.offset) % anim1.getLife());
    anim2.setTime((time + in2.offset) % anim2.getLife());
    anim3.setTime((time + in3.offset) % anim3.getLife());

    // const c1 = anim1.output instanceof anim ? anim1.output : anim1;
    // const c2 = anim2.output instanceof anim ? anim2.output : anim2;
    // const c3 = anim3.output instanceof anim ? anim3.output : anim3;

    if (this._output) {
      this._output.blend2D(anim1, anim2, anim3, a, b);
    }
  }

  /**
   * Clone a new Blend1D clip
   * @param {boolean} cloneInputs True if clone the input clips
   * @return {clay.animation.Blend2DAnimator}
   */
  // clone(cloneInputs) {
  //   const clip = Clip.prototype.clone.call(this);
  //   clip.output = this.output.clone();
  //   for (let i = 0; i < this.inputs.length; i++) {
  //     const inputClip = cloneInputs ? this.inputs[i].clip.clone(true) : this.inputs[i].clip;
  //     clip.addInput(this.inputs[i].position, inputClip, this.inputs[i].offset);
  //   }
  //   return clip;
  // };

  private _updateTriangles() {
    const inputs = this._inputs.map((a) => a.position);
    this._triangles = delaunay.triangulate(inputs, 'array') as any as Triangle[];
  }
  private _findTriangle(position: Vector2) {
    if (this._cacheTriangle) {
      const res = delaunay.contains(this._cacheTriangle.vertices, position.array);
      if (res) {
        return [this._cacheTriangle, res[0], res[1]];
      }
    }
    if (this._triangles) {
      for (let i = 0; i < this._triangles.length; i++) {
        const tri = this._triangles[i];
        const res = delaunay.contains(tri.vertices, position.array);
        if (res) {
          this._cacheTriangle = tri;
          return [tri, res[0], res[1]];
        }
      }
    }
  }
}

export default Blend2DAnimator;
