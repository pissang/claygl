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
    Object.assign(this, opts);
  }
  clone() {
    const light = super.clone();
    light.range = this.range;
    return light;
  }
}

PointLight.prototype.uniformTemplates = {
  pointLightPosition: {
    type: '3f',
    value: function (instance) {
      return instance.getWorldPosition().array;
    }
  },
  pointLightRange: {
    type: '1f',
    value: function (instance) {
      return (instance as PointLight).range;
    }
  },
  pointLightColor: {
    type: '3f',
    value: function (instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};
export default PointLight;
