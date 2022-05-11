import Light, { LightOpts } from '../Light';
import Vector3 from '../math/Vector3';

export interface TubeLightOpts extends LightOpts {
  range: number;
  radius: number;
  length: number;
}

class TubeLight extends Light {
  range = 100;
  length = 5;

  readonly type = 'TUBE_LIGHT';

  constructor(opts?: Partial<TubeLightOpts>) {
    super(opts);
    Object.assign(this, opts);
  }

  clone() {
    const light = super.clone();
    light.range = this.range;
    light.length = this.length;
    return light;
  }
}

TubeLight.prototype.uniformTemplates = {
  tubeLightPosition: {
    type: '3f',
    value: function (instance) {
      return instance.getWorldPosition().array;
    }
  },

  tubeLightExtend: {
    type: '3f',
    value: (function () {
      const x = new Vector3();
      return function (instance) {
        // Extend in x axis
        return x
          .copy(instance.worldTransform.x)
          .normalize()
          .scale((instance as TubeLight).length / 2).array;
      };
    })()
  },

  tubeLightRange: {
    type: '1f',
    value: function (instance) {
      return (instance as TubeLight).range;
    }
  },

  tubeLightColor: {
    type: '3f',
    value: function (instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};

export default TubeLight;
