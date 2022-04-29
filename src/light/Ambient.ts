import Light, { LightOpts } from '../Light';

export interface AmbientLightOpts extends LightOpts {}
class AmbientLight extends Light {
  castShadow = false;
  readonly type = 'AMBIENT_LIGHT';
}
AmbientLight.prototype.uniformTemplates = {
  ambientLightColor: {
    type: '3f',
    value(instance) {
      const color = instance.color;
      const intensity = instance.intensity;
      return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
    }
  }
};

export default AmbientLight;
