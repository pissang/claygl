import Light, { LightOpts } from '../Light';

export interface SphereLightOpts extends LightOpts {
  range: number;
  radius: number;
}

class SphereLight extends Light {
  range = 100;
  radius = 5;

  readonly type = 'SPHERE_LIGHT';

  constructor(opts?: Partial<SphereLightOpts>) {
    super(opts);
    Object.assign(this, opts);
  }

  clone() {
    const light = super.clone();
    light.range = this.range;
    light.radius = this.radius;
    return light;
  }
}

SphereLight.prototype.uniformTemplates = {
  sphereLightPosition: {
    type: '3f',
    value(instance) {
      return instance.getWorldPosition().array;
    }
  },
  sphereLightRange: {
    type: '1f',
    value(instance) {
      return (instance as SphereLight).range;
    }
  },
  sphereLightRadius: {
    type: '1f',
    value(instance) {
      return (instance as SphereLight).radius;
    }
  },
  sphereLightColor: {
    type: '3f',
    value(instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};

export default SphereLight;
