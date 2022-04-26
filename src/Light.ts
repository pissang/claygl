import { Color } from './core/type';
import ClayNode, { ClayNodeOpts } from './Node';
import Shader from './Shader';

import lightShader from './shader/source/header/light';
Shader.import(lightShader);

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
  intensity = 1.0;
  castShadow = true;
  shadowResolution = 512;
  group = 0;

  /**
   * Light type
   */
  type = 'light';

  uniformTemplates?: Record<
    string,
    {
      type: string;
      value: (instance: Light) => any;
    }
  >;

  constructor(opts?: Partial<LightOpts>) {
    opts = opts || {};
    super(opts);
    Object.assign(this, opts);
  }
  /**
   * @return {clay.Light}
   * @memberOf clay.Light.prototype
   */
  clone() {
    const light = super.clone.call(this);
    light.color = Array.prototype.slice.call(this.color);
    light.intensity = this.intensity;
    light.castShadow = this.castShadow;
    light.shadowResolution = this.shadowResolution;

    return light;
  }
}

export default Light;
