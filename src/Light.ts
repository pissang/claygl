import { Color } from './core/type';
import { assign } from './core/util';
import type Mesh from './Mesh';
import ClayNode, { ClayNodeOpts } from './Node';
import { UniformType } from './Shader';

export interface LightOpts extends ClayNodeOpts {
  /**
   * Light RGB color
   */
  color: Color;

  /**
   * Light intensity
   */
  intensity: number;

  // Config for shadow map
  /**
   * If light cast shadow
   */
  castShadow: boolean;

  /**
   * Shadow map size
   */
  shadowResolution: number;

  /**
   * Light group, shader with same `lightGroup` will be affected
   *
   * Only useful in forward rendering
   */
  group: number;
}
interface Light extends LightOpts {}
class Light extends ClayNode {
  color = [1, 1, 1];
  intensity = 1;

  castShadow = true;
  shadowResolution = 512;

  group = 0;

  /**
   * Volumn mesh for deferred rendering
   */
  volumeMesh?: Mesh;

  /**
   * Light type
   */
  type = 'light';

  uniformTemplates?: Record<
    string,
    {
      type: UniformType;
      value: (instance: Light) => any;
    }
  >;

  constructor(opts?: Partial<LightOpts>) {
    super(opts);
    assign(this, opts);
  }
  /**
   * @return {clay.Light}
   * @memberOf clay.Light.prototype
   */
  clone() {
    const light = super.clone();
    light.color = Array.prototype.slice.call(this.color);
    light.intensity = this.intensity;
    light.castShadow = this.castShadow;
    light.shadowResolution = this.shadowResolution;

    return light;
  }
}

export default Light;
