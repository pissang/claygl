import { assign } from '../core/util';
import Light, { LightOpts } from '../Light';

export interface SpotLightOpts extends LightOpts {
  range: number;
  umbraAngle: number;
  penumbraAngle: number;
  falloffFactor: number;
  shadowBias: number;
  shadowSlopeScale: number;
}

class SpotLight extends Light {
  range = 20;
  umbraAngle = 30;
  penumbraAngle = 45;
  falloffFactor = 2.0;
  shadowBias = 0.001;
  shadowSlopeScale = 2.0;

  readonly type = 'SPOT_LIGHT';

  constructor(opts?: Partial<SpotLightOpts>) {
    super(opts);
    assign(this, opts);
  }
  clone() {
    const light = super.clone();
    light.range = this.range;
    light.umbraAngle = this.umbraAngle;
    light.penumbraAngle = this.penumbraAngle;
    light.falloffFactor = this.falloffFactor;
    light.shadowBias = this.shadowBias;
    light.shadowSlopeScale = this.shadowSlopeScale;
    return light;
  }
}

SpotLight.prototype.uniformTemplates = {
  spotLightPosition: {
    type: '3f',
    value(instance) {
      return instance.getWorldPosition().array;
    }
  },
  spotLightRange: {
    type: '1f',
    value(instance) {
      return (instance as SpotLight).range;
    }
  },
  spotLightUmbraAngleCosine: {
    type: '1f',
    value(instance) {
      return Math.cos(((instance as SpotLight).umbraAngle * Math.PI) / 180);
    }
  },
  spotLightPenumbraAngleCosine: {
    type: '1f',
    value(instance) {
      return Math.cos(((instance as SpotLight).penumbraAngle * Math.PI) / 180);
    }
  },
  spotLightFalloffFactor: {
    type: '1f',
    value(instance) {
      return (instance as SpotLight).falloffFactor;
    }
  },
  spotLightDirection: {
    type: '3f',
    value(instance) {
      // TODO
      // Direction is target to eye
      return instance.worldTransform.z.clone().negate().array;
    }
  },
  spotLightColor: {
    type: '3f',
    value(instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};

export default SpotLight;
