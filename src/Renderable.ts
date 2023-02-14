import ClayNode, { ClayNodeOpts, GetBoundingBoxFilter } from './Node';
import * as constants from './core/constants';
import BoundingBox from './math/BoundingBox';
import type Renderer from './Renderer';
import type Material from './Material';
import type Geometry from './Geometry';
import { GLEnum } from './core/type';

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
   *  + {@link clay.constants.BACK}
   *  + {@link clay.constants.FRONT}
   *  + {@link clay.constants.FRONT_AND_BACK}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/cullFace
   */
  cullFace: GLEnum;

  /**
   * Specify which side is front face.
   * Possible values:
   *  + {@link clay.constants.CW}
   *  + {@link clay.constants.CCW}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/frontFace
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
  // TODO should be readonly?
  // type will be useless if material is changed.
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
   */
  beforeRender() {}

  /**
   * Before render hook
   */
  afterRender() {}

  getBoundingBox(filter?: GetBoundingBoxFilter, out?: BoundingBox): BoundingBox {
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
