import ClayNode, { ClayNodeOpts, GetBoundingBoxFilter } from './Node';
import glenum from './core/glenum';
import type Material from './Material';
import type Geometry from './Geometry';
import { BoundingBox } from './claygl';

export interface RenderableOpts extends ClayNodeOpts {
  material: Material;
  geometry: Geometry;

  mode: number;

  /**
   * Group of received light.
   */
  lightGroup: number;
  /**
   * Render order, Nodes with smaller value renders before nodes with larger values.
   */
  renderOrder: number;

  /**
   * Used when mode is LINES, LINE_STRIP or LINE_LOOP
   */
  lineWidth?: number;

  /**
   * If enable culling
   */
  culling: boolean;

  /**
   * Specify which side of polygon will be culled.
   * Possible values:
   *  + {@link clay.Renderable.BACK}
   *  + {@link clay.Renderable.FRONT}
   *  + {@link clay.Renderable.FRONT_AND_BACK}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace
   */
  cullFace: number;

  /**
   * Specify which side is front face.
   * Possible values:
   *  + {@link clay.Renderable.CW}
   *  + {@link clay.Renderable.CCW}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace
   */
  frontFace: number;

  /**
   * If enable software frustum culling
   */
  frustumCulling: boolean;

  /**
   * If cast shadow
   */
  castShadow: boolean;
  /**
   * If receive shadow
   */
  receiveShadow: boolean;

  /**
   * If ignore picking
   */
  ignorePicking: boolean;
  /**
   * If Ignore prez
   */
  ignorePreZ: boolean;

  /**
   * If ignore gbuffer
   */
  ignoreGBuffer: boolean;
}

const properties = [
  'mode',
  'lightGroup',
  'renderOrder',
  'lineWidth',
  'culling',
  'cullFace',
  'frontFace',
  'frustumCulling',
  'castShadow',
  'receiveShadow',
  'ignorePicking',
  'ignorePreZ',
  'ignoreGBuffer'
] as const;

interface Renderable extends RenderableOpts {}
class Renderable extends ClayNode {
  /**
   * Bounding box of renderable
   */
  boundingBox?: BoundingBox;

  constructor(opts?: Partial<RenderableOpts>) {
    opts = opts || {};
    super(opts);

    for (let i = 0; i < properties.length; i++) {
      const name = properties[i];
      if (opts[name] != null) {
        (this as any)[name] = opts[name];
      }
    }

    opts.geometry && (this.geometry = opts.geometry);
    opts.material && (this.material = opts.material);
  }

  /**
   * @return {boolean}
   */
  isRenderable(): boolean {
    // TODO Shader ?
    return !!(
      this.geometry &&
      this.material &&
      this.material.shader &&
      !this.invisible &&
      this.geometry.vertexCount > 0
    );
  }

  /**
   * Before render hook
   * @type {Function}
   */
  beforeRender(gl: WebGLRenderingContext) {}

  /**
   * Before render hook
   * @type {Function}
   */
  afterRender(gl: WebGLRenderingContext, renderStat) {}

  getBoundingBox(filter: GetBoundingBoxFilter, out?: BoundingBox): BoundingBox {
    out = super.getBoundingBox.call(this, filter, out);
    if (this.geometry && this.geometry.boundingBox) {
      out.union(this.geometry.boundingBox);
    }

    return out;
  }

  /**
   * Clone a new renderable
   * @function
   * @return {clay.Renderable}
   */
  clone() {
    const renderable = super.clone.call(this);

    renderable.geometry = this.geometry;
    renderable.material = this.material;

    for (let i = 0; i < properties.length; i++) {
      const name = properties[i];
      // Try not to overwrite the prototype property
      if (renderable[name] !== this[name]) {
        renderable[name] = this[name];
      }
    }

    return renderable;
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

Renderable.prototype.mode = glenum.TRIANGLES;

Renderable.prototype.lightGroup = 0;
Renderable.prototype.renderOrder = 0;

Renderable.prototype.culling = true;
Renderable.prototype.cullFace = glenum.BACK;
Renderable.prototype.frontFace = glenum.CCW;

Renderable.prototype.frustumCulling = true;
Renderable.prototype.receiveShadow = true;
Renderable.prototype.castShadow = true;
Renderable.prototype.ignorePicking = false;
Renderable.prototype.ignorePreZ = false;
Renderable.prototype.ignoreGBuffer = false;

export default Renderable;
