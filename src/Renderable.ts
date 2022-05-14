import ClayNode, { ClayNodeOpts, GetBoundingBoxFilter } from './Node';
import * as constants from './core/constants';
import BoundingBox from './math/BoundingBox';
import type Renderer from './Renderer';
import type Material from './Material';
import type Geometry from './Geometry';
import { GLEnum } from './core/type';
import GeometryBase from './GeometryBase';

export interface RenderableOpts extends ClayNodeOpts {
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
  cullFace: GLEnum;

  /**
   * Specify which side is front face.
   * Possible values:
   *  + {@link clay.Renderable.CW}
   *  + {@link clay.Renderable.CCW}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace
   */
  frontFace: GLEnum;

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

interface Renderable<T extends Material = Material> extends RenderableOpts {}
class Renderable<T extends Material = Material> extends ClayNode {
  geometry: Geometry;
  material: T;
  /**
   * Bounding box of renderable
   */
  boundingBox?: BoundingBox;

  /**
   * Customized shadow depth material
   */
  shadowDepthMaterial?: Material;
  // Depth for transparent list sorting
  __depth = 0;

  constructor(geometry: Geometry, material: T, opts?: Partial<RenderableOpts>) {
    super(opts);
    opts = opts || {};

    for (let i = 0; i < properties.length; i++) {
      const name = properties[i];
      if (opts[name] != null) {
        (this as any)[name] = opts[name];
      }
    }

    this.geometry = geometry;
    this.material = material;
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
  beforeRender(renderer: Renderer) {}

  /**
   * Before render hook
   * @type {Function}
   */
  afterRender(renderer: Renderer) {}

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

const proto = Renderable.prototype;
proto.mode = constants.TRIANGLES;

proto.lightGroup = 0;
proto.renderOrder = 0;

proto.culling = true;
proto.cullFace = constants.BACK;
proto.frontFace = constants.CCW;

proto.frustumCulling = true;
proto.receiveShadow = true;
proto.castShadow = true;
proto.ignorePicking = false;
proto.ignorePreZ = false;
proto.ignoreGBuffer = false;

export default Renderable;
