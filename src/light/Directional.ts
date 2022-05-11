import Light, { LightOpts } from '../Light';
import Vector3 from '../math/Vector3';

export interface DirectionalLightOpts extends LightOpts {
  shadowBias: number;
  shadowSlopeScale: number;
  /**
   * Shadow cascade.
   * Use PSSM technique when it is larger than 1 and have a unique directional light in scene.
   */
  shadowCascade: number;

  /**
   * Available when shadowCascade is larger than 1 and have a unique directional light in scene.
   */
  cascadeSplitLogFactor: number;
}
/**
 * @example
 *     const light = new clay.light.Directional({
 *         intensity: 0.5,
 *         color: [1.0, 0.0, 0.0]
 *     });
 *     light.position.set(10, 10, 10);
 *     light.lookAt(clay.Vector3.ZERO);
 *     scene.add(light);
 */
class DirectionalLight extends Light {
  shadowBias = 0.001;
  shadowSlopeScale = 2.0;
  shadowCascade = 1;
  cascadeSplitLogFactor = 0.2;

  readonly type = 'DIRECTIONAL_LIGHT';

  constructor(opts?: Partial<DirectionalLightOpts>) {
    super(opts);
    Object.assign(this, opts);
  }

  clone() {
    const light = super.clone();
    light.shadowBias = this.shadowBias;
    light.shadowSlopeScale = this.shadowSlopeScale;
    return light;
  }
}

DirectionalLight.prototype.uniformTemplates = {
  directionalLightDirection: {
    type: '3f',
    value(instance) {
      const dir = new Vector3();
      // Direction is target to eye
      return dir.copy(instance.worldTransform.z).normalize().negate().array;
    }
  },
  directionalLightColor: {
    type: '3f',
    value(instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};
export default DirectionalLight;
