import { assign } from '../core/util';
import Light, { LightOpts } from '../Light';

export interface PointLightOpts extends LightOpts {
  range: number;
}

class PointLight extends Light {
  range = 100;
  castShadow: boolean = false;

  readonly type = 'POINT_LIGHT';

  constructor(opts?: Partial<PointLightOpts>) {
    super(opts);
    assign(this, opts);
  }
  clone() {
    const light = super.clone();
    light.range = this.range;
    return light;
  }
}

PointLight.prototype.uniformTemplates = {
  pointLightPosition: {
    type: 'vec3',
    value: function (instance) {
      return instance.getWorldPosition().array;
    }
  },
  pointLightRange: {
    type: 'float',
    value: function (instance) {
      return (instance as PointLight).range;
    }
  },
  pointLightColor: {
    type: 'vec3',
    value: function (instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};
export default PointLight;
