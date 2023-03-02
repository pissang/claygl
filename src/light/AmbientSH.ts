import Light, { LightOpts } from '../Light';
import Renderer from '../Renderer';
import TextureCube from '../TextureCube';
import { projectEnvironmentMap, ProjectEnvironmentMapOpts } from '../util/sh';

export interface AmbientSHLightOpts extends LightOpts {
  coefficients: ArrayLike<number>;
}
class AmbientSHLight extends Light {
  coefficients: ArrayLike<number>;

  readonly type = 'AMBIENT_SH_LIGHT';

  __coefficientsTmpArr = new Float32Array(9 * 3);
  constructor(opts?: Partial<AmbientSHLightOpts>) {
    super(opts);
    this.coefficients = (opts && opts.coefficients) || [];
  }

  calculateFromEnvironmentMap(
    renderer: Renderer,
    cubemap: TextureCube,
    opts?: ProjectEnvironmentMapOpts
  ) {
    this.coefficients = projectEnvironmentMap(renderer, cubemap!, opts);
  }

  clone() {
    const light = super.clone();
    light.coefficients = this.coefficients;
    return light;
  }
}

AmbientSHLight.prototype.uniformTemplates = {
  ambientSHLightColor: {
    type: 'vec3',
    value(instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  },

  ambientSHLightCoefficients: {
    type: 'vec3',
    value(instance) {
      const coefficientsTmpArr = (instance as AmbientSHLight).__coefficientsTmpArr;
      for (let i = 0; i < (instance as AmbientSHLight).coefficients.length; i++) {
        coefficientsTmpArr[i] = (instance as AmbientSHLight).coefficients[i];
      }
      return coefficientsTmpArr;
    }
  }
};

export default AmbientSHLight;
